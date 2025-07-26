import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MicrosoftMessage {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  bodyPreview: string;
  receivedDateTime: string;
  parentFolderId: string;
}

interface OutlookToken {
  user_id: string;
  access_token: string;
}

export async function GET(req: NextRequest) {
  try {
    console.log('[Sync Inbox] Starting inbox sync...');

    // Load Outlook access token from outlook_tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('user_id, access_token')
      .eq('user_email', 'testbloc@blociq.co.uk')
      .maybeSingle();

    if (!tokenData || tokenError) {
      console.error('[Sync Inbox] Failed to load Outlook token:', tokenError);
      return NextResponse.json(
        { success: false, error: 'Outlook token not found' },
        { status: 404 }
      );
    }

    console.log('[Sync Inbox] Loaded token for user:', tokenData.user_id);

    // Fetch all messages from Microsoft Graph API with pagination
    let nextLink: string | null = 'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$orderby=receivedDateTime desc';
    let totalSynced = 0;
    let totalErrors = 0;

    while (nextLink) {
      console.log('[Sync Inbox] Fetching messages from:', nextLink);
      
      const response = await fetch(nextLink, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('[Sync Inbox] Microsoft Graph API error:', response.status, response.statusText);
        return NextResponse.json(
          { success: false, error: `Microsoft API error: ${response.status}` },
          { status: response.status }
        );
      }

      const graphData = await response.json();
      const messages: MicrosoftMessage[] = graphData.value || [];
      nextLink = graphData['@odata.nextLink'] || null;

      console.log('[Sync Inbox] Fetched', messages.length, 'messages from current page');

      // Process each message in the current page
      for (const message of messages) {
        try {
          const emailData = {
            user_id: tokenData.user_id,
            subject: message.subject || '',
            from_name: message.from?.emailAddress?.name || '',
            from_email: message.from?.emailAddress?.address || '',
            body_preview: message.bodyPreview || '',
            received_at: message.receivedDateTime,
            outlook_message_id: message.id,
            folder: message.parentFolderId || '',
            sync_status: 'fetched',
            last_sync_at: new Date().toISOString(),
          };

          console.log('[Sync Inbox] Upserting message:', message.id, '-', message.subject);

          const { error: upsertError } = await supabase
            .from('incoming_emails')
            .upsert(emailData, { onConflict: 'outlook_message_id' });

          if (upsertError) {
            console.error('[Sync Inbox] Failed to upsert message', message.id, ':', upsertError);
            totalErrors++;
          } else {
            console.log('[Sync Inbox] Successfully upserted message:', message.id);
            totalSynced++;
          }
        } catch (messageError) {
          console.error('[Sync Inbox] Error processing message', message.id, ':', messageError);
          totalErrors++;
        }
      }

      console.log('[Sync Inbox] Page completed. Total synced so far:', totalSynced, 'Errors:', totalErrors);
    }

    console.log('[Sync Inbox] Full sync completed. Total synced:', totalSynced, 'Total errors:', totalErrors);

    return NextResponse.json({
      success: true,
      synced: totalSynced,
    });

  } catch (error) {
    console.error('[Sync Inbox] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 