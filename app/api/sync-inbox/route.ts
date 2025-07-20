import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get Outlook access token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('outlook_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ 
        error: 'Outlook not connected. Please connect your Outlook account first.' 
      }, { status: 400 });
    }

    // Fetch recent emails from Microsoft Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=receivedDateTime desc', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch emails from Outlook:', await response.text());
      return NextResponse.json({ 
        error: 'Failed to fetch emails from Outlook' 
      }, { status: 500 });
    }

    const outlookData = await response.json();
    const outlookEmails = outlookData.value || [];

    let syncedCount = 0;
    let skippedCount = 0;

    // Process each email
    for (const outlookEmail of outlookEmails) {
      try {
        // Check if email already exists
        const { data: existingEmail } = await supabase
          .from('incoming_emails')
          .select('id')
          .eq('outlook_id', outlookEmail.id)
          .single();

        if (existingEmail) {
          skippedCount++;
          continue; // Skip if already exists
        }

        // Extract email content
        const emailBody = outlookEmail.body?.content || '';
        const bodyPreview = emailBody.length > 200 
          ? emailBody.substring(0, 200) + '...' 
          : emailBody;

        // Insert new email
        const { error: insertError } = await supabase
          .from('incoming_emails')
          .insert({
            subject: outlookEmail.subject || 'No Subject',
            from_name: outlookEmail.from?.emailAddress?.name || null,
            from_email: outlookEmail.from?.emailAddress?.address || null,
            received_at: outlookEmail.receivedDateTime,
            body_preview: bodyPreview,
            body_full: emailBody,
            outlook_id: outlookEmail.id,
            is_read: outlookEmail.isRead || false,
            is_handled: false,
            user_id: session.user.id,
            tags: [], // Will be populated by AI later
          });

        if (insertError) {
          console.error('Error inserting email:', insertError);
          continue;
        }

        syncedCount++;
      } catch (error) {
        console.error('Error processing email:', error);
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      skipped: skippedCount,
      total: outlookEmails.length,
      message: `Synced ${syncedCount} new emails, skipped ${skippedCount} existing emails`
    });

  } catch (error) {
    console.error('Error syncing inbox:', error);
    return NextResponse.json({ 
      error: 'Internal server error during sync' 
    }, { status: 500 });
  }
} 