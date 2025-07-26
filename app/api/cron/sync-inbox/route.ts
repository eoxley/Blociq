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

    // Fetch messages from Microsoft Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=10', {
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

    console.log('[Sync Inbox] Fetched', messages.length, 'messages from Microsoft');

    let successCount = 0;
    let errorCount = 0;

    // Process each message
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
          errorCount++;
        } else {
          console.log('[Sync Inbox] Successfully upserted message:', message.id);
          successCount++;
        }
      } catch (messageError) {
        console.error('[Sync Inbox] Error processing message', message.id, ':', messageError);
        errorCount++;
      }
    }

    console.log('[Sync Inbox] Sync completed. Success:', successCount, 'Errors:', errorCount);

    return NextResponse.json({
      success: true,
      count: successCount,
      errors: errorCount,
      total: messages.length,
    });

  } catch (error) {
    console.error('[Sync Inbox] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 