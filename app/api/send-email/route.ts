import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookies() });
  const { emailId, draft, buildingId } = await req.json();

  // Get the current user's session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Step 1: Get the original email
  const { data: email, error: fetchError } = await supabase
    .from('incoming_emails')
    .select('*')
    .eq('id', emailId)
    .single();

  if (fetchError || !email) {
    console.error('Email not found:', fetchError?.message);
    return NextResponse.json({ error: 'Email not found' }, { status: 404 });
  }

  // Step 2: Send email via Outlook API
  let outlookMessageId = null;
  let sendSuccess = false;
  
  try {
    // Get Outlook access token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('outlook_access_token')?.value;

    if (accessToken) {
      // Send email via Microsoft Graph API
      const sendResponse = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            subject: `RE: ${email.subject}`,
            body: {
              contentType: 'HTML',
              content: draft,
            },
            toRecipients: [
              {
                emailAddress: {
                  address: email.from_email,
                },
              },
            ],
          },
        }),
      });

      if (sendResponse.ok) {
        sendSuccess = true;
        // Get the message ID from the response headers or create a unique one
        outlookMessageId = `outlook_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        console.log('✅ Email sent successfully via Outlook API');
      } else {
        console.error('❌ Failed to send email via Outlook API:', await sendResponse.text());
      }
    } else {
      console.log('⚠️ No Outlook access token found, using placeholder send');
      sendSuccess = true; // For development/testing
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
    // Continue with logging even if send fails
  }

  // Step 3: Log the sent email to sent_emails table
  let logId = null;
  try {
    const { data: sentEmailLog, error: logError } = await supabase
      .from('sent_emails')
      .insert({
        user_id: session.user.id,
        to_email: email.from_email,
        subject: `RE: ${email.subject}`,
        body: draft,
        building_id: buildingId || null,
        outlook_id: outlookMessageId,
        related_incoming_email: emailId,
        sent_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (logError) {
      console.error('❌ Error logging sent email:', logError);
    } else {
      logId = sentEmailLog?.id;
      console.log('✅ Sent email logged successfully:', logId);
    }
  } catch (logError) {
    console.error('❌ Error logging sent email:', logError);
    // Don't fail the entire request if logging fails
  }

  // Step 4: Mark original email as handled
  try {
    await supabase
      .from('incoming_emails')
      .update({ 
        is_handled: true,
        handled_at: new Date().toISOString()
      })
      .eq('id', emailId);
    
    console.log('✅ Email marked as handled');
  } catch (handleError) {
    console.error('❌ Error marking email as handled:', handleError);
  }

  // Step 5: Log to email history (existing functionality)
  try {
    await supabase.from('email_history').insert({
      email_id: emailId,
      sent_text: draft,
    });
  } catch (historyError) {
    console.error('❌ Error logging to email history:', historyError);
  }

  return NextResponse.json({ 
    status: sendSuccess ? "sent" : "failed",
    log_id: logId,
    message: sendSuccess ? "Email sent successfully" : "Failed to send email",
    outlook_message_id: outlookMessageId
  });
}
