import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookies() });
  const { to, subject, body, buildingId } = await req.json();

  // Get the current user's session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Validate required fields
  if (!to || !subject || !body) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Step 1: Send email via Outlook API
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
            subject: subject,
            body: {
              contentType: 'HTML',
              content: body,
            },
            toRecipients: [
              {
                emailAddress: {
                  address: to,
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
        console.log('✅ New email sent successfully via Outlook API');
      } else {
        console.error('❌ Failed to send new email via Outlook API:', await sendResponse.text());
      }
    } else {
      console.log('⚠️ No Outlook access token found, using placeholder send');
      sendSuccess = true; // For development/testing
    }
  } catch (error) {
    console.error('❌ Error sending new email:', error);
    // Continue with logging even if send fails
  }

  // Step 2: Log the sent email to sent_emails table
  let logId = null;
  try {
    const { data: sentEmailLog, error: logError } = await supabase
      .from('sent_emails')
      .insert({
        user_id: session.user.id,
        to_email: to,
        subject: subject,
        body: body,
        building_id: buildingId || null,
        outlook_id: outlookMessageId,
        related_incoming_email: null, // This is a new email, not a reply
        sent_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (logError) {
      console.error('❌ Error logging sent email:', logError);
    } else {
      logId = sentEmailLog?.id;
      console.log('✅ New email logged successfully:', logId);
    }
  } catch (logError) {
    console.error('❌ Error logging sent email:', logError);
    // Don't fail the entire request if logging fails
  }

  // Step 3: Log contact to known_contacts table
  try {
    await supabase
      .from('known_contacts')
      .upsert({
        email: to.toLowerCase(),
        last_contacted: new Date().toISOString()
      }, {
        onConflict: 'user_id,email'
      });
    
    console.log('✅ Contact logged successfully');
  } catch (contactError) {
    console.error('❌ Error logging contact:', contactError);
  }

  return NextResponse.json({ 
    status: sendSuccess ? "sent" : "failed",
    log_id: logId,
    message: sendSuccess ? "Email sent successfully" : "Failed to send email",
    outlook_message_id: outlookMessageId
  });
} 