import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ STEP 3: Reduce Cron Job Frequency - Now serves as fallback
// ✅ FIXED: Make user-specific instead of hardcoded
export async function GET() {
  console.log('📬 Starting fallback inbox sync for all connected users');

  // Get all active Outlook tokens for different users
  const { data: tokenRows, error: tokenError } = await supabase
    .from('outlook_tokens')
    .select('*')
    .not('access_token', 'is', null)
    .not('access_token', 'eq', '')
    .order('created_at', { ascending: false });

  if (tokenError || !tokenRows || tokenRows.length === 0) {
    console.error('❌ Failed to fetch access tokens:', tokenError);
    return NextResponse.json({ success: false, error: 'No tokens available' }, { status: 401 });
  }

  console.log(`📧 Found ${tokenRows.length} active Outlook tokens to sync`);

  let totalSynced = 0;

  // Sync emails for each connected user
  for (const tokenRow of tokenRows) {
    try {
      console.log(`🔄 Syncing emails for user: ${tokenRow.user_email}`);
      
      let url = 'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$orderby=receivedDateTime desc';
      let userSynced = 0;

      while (url) {
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${tokenRow.access_token}`,
          },
        });

        const result = await res.json();

        if (!res.ok) {
          console.error(`❌ Microsoft API error for ${tokenRow.user_email}:`, result);
          break; // Skip this user and continue with next
        }

        console.log(`📥 Page fetched for ${tokenRow.user_email}: ${result.value?.length ?? 0} messages`);

        for (const msg of result.value || []) {
          console.log('📨 Processing message:', msg.subject);

          const insert = {
            user_id: tokenRow.user_id,
            subject: msg.subject ?? null,
            from_email: msg.from?.emailAddress?.address ?? null,
            from_name: msg.from?.emailAddress?.name ?? null,
            body_preview: msg.bodyPreview ?? null,
            received_at: msg.receivedDateTime ?? null,
            outlook_message_id: msg.id ?? null,
            folder: msg.parentFolderId ?? null,
            sync_status: 'cron_synced',
            last_sync_at: new Date().toISOString(),
          };

          const { error } = await supabase
            .from('incoming_emails')
            .upsert(insert, { onConflict: 'outlook_message_id' });

          if (error) {
            console.error('❌ Failed to insert message:', msg.id, error);
          } else {
            console.log('✅ Saved message:', msg.id);
            userSynced++;
          }
        }

        url = result['@odata.nextLink'] ?? null;
      }

      console.log(`✅ Synced ${userSynced} emails for ${tokenRow.user_email}`);
      totalSynced += userSynced;

    } catch (error) {
      console.error(`❌ Error syncing for ${tokenRow.user_email}:`, error);
      // Continue with next user instead of failing completely
    }
  }

  return NextResponse.json({ 
    success: true, 
    synced: totalSynced,
    users_processed: tokenRows.length
  });
} 