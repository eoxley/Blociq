import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ STEP 3: Reduce Cron Job Frequency - Now serves as fallback
// ✅ FIXED: Make user-specific instead of hardcoded
export async function GET() {
  console.log('📬 Starting automatic inbox sync for all connected users');

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
  let totalUsers = 0;

  // Sync emails for each connected user
  for (const tokenRow of tokenRows) {
    try {
      console.log(`🔄 Syncing emails for user: ${tokenRow.user_email}`);
      
      // Check if token is expired and refresh if needed
      const now = new Date();
      const expiresAt = new Date(tokenRow.expires_at);
      
      let accessToken = tokenRow.access_token;
      
      if (expiresAt <= now) {
        console.log(`🔄 Token expired for ${tokenRow.user_email}, refreshing...`);
        
        try {
          const tenantId = process.env.OUTLOOK_TENANT_ID || 'common';
          const refreshResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: process.env.OUTLOOK_CLIENT_ID!,
              client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
              grant_type: 'refresh_token',
              refresh_token: tokenRow.refresh_token,
              redirect_uri: process.env.OUTLOOK_REDIRECT_URI!,
            }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();

            // Update the stored token
            const { error: updateError } = await supabase
              .from('outlook_tokens')
              .update({
                access_token: refreshData.access_token,
                refresh_token: refreshData.refresh_token,
                expires_at: newExpiresAt
              })
              .eq('user_id', tokenRow.user_id);

            if (!updateError) {
              accessToken = refreshData.access_token;
              console.log(`✅ Token refreshed for ${tokenRow.user_email}`);
            }
          }
        } catch (error) {
          console.error(`❌ Failed to refresh token for ${tokenRow.user_email}:`, error);
          continue; // Skip this user and continue with next
        }
      }

      // Fetch recent emails (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      let url = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=50&$orderby=receivedDateTime desc&$filter=receivedDateTime ge '${thirtyDaysAgo}'&$select=id,subject,bodyPreview,body,from,receivedDateTime,isRead,flag,importance,categories,hasAttachments,internetMessageId`;
      let userSynced = 0;

      while (url) {
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
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
            body_full: msg.body?.content ?? null,
            received_at: msg.receivedDateTime ?? null,
            unread: !msg.isRead,
            is_read: msg.isRead,
            flag_status: msg.flag?.flagStatus ?? null,
            categories: msg.categories ?? null,
            importance: msg.importance ?? null,
            has_attachments: msg.hasAttachments ?? false,
            outlook_id: msg.id ?? null,
            outlook_message_id: msg.internetMessageId ?? null,
            folder: 'inbox',
            sync_status: 'cron_synced',
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error } = await supabase
            .from('incoming_emails')
            .upsert(insert, { 
              onConflict: 'outlook_message_id',
              ignoreDuplicates: false
            });

          if (error) {
            console.error('❌ Failed to insert message:', msg.id, error);
          } else {
            console.log('✅ Saved message:', msg.subject);
            userSynced++;
          }
        }

        url = result['@odata.nextLink'] ?? null;
      }

      console.log(`✅ Synced ${userSynced} emails for ${tokenRow.user_email}`);
      totalSynced += userSynced;
      totalUsers++;

    } catch (error) {
      console.error(`❌ Error syncing for ${tokenRow.user_email}:`, error);
      // Continue with next user instead of failing completely
    }
  }

  console.log(`🎉 Cron sync completed: ${totalSynced} emails synced for ${totalUsers} users`);

  return NextResponse.json({ 
    success: true, 
    synced: totalSynced,
    users_processed: totalUsers,
    message: `Cron job completed. Synced ${totalSynced} emails across ${totalUsers} users.`
  });
} 