import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  console.log('📬 Starting full inbox sync for testbloc@blociq.co.uk');

  const { data: tokenRow, error: tokenError } = await supabase
    .from('outlook_tokens')
    .select('*')
    .eq('user_email', 'testbloc@blociq.co.uk')
    .maybeSingle();

  if (tokenError || !tokenRow?.access_token) {
    console.error('❌ Failed to fetch access token:', tokenError);
    return NextResponse.json({ success: false, error: 'No token available' }, { status: 401 });
  }

  let url = 'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$orderby=receivedDateTime desc';
  let count = 0;

  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokenRow.access_token}`,
      },
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('❌ Microsoft API error:', result);
      return NextResponse.json({ success: false, error: result }, { status: res.status });
    }

    console.log(`📥 Page fetched: ${result.value?.length ?? 0} messages`);

    for (const msg of result.value || []) {
      const insert = {
        user_id: tokenRow.user_id,
        subject: msg.subject ?? null,
        from_email: msg.from?.emailAddress?.address ?? null,
        from_name: msg.from?.emailAddress?.name ?? null,
        body_preview: msg.bodyPreview ?? null,
        received_at: msg.receivedDateTime ?? null,
        outlook_message_id: msg.id ?? null,
        folder: msg.parentFolderId ?? null,
        sync_status: 'fetched',
        last_sync_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('incoming_emails')
        .upsert(insert, { onConflict: 'outlook_message_id' });

      if (error) {
        console.error('❌ Failed to insert message:', msg.id, error);
      } else {
        console.log('✅ Saved message:', msg.id);
        count++;
      }
    }

    url = result['@odata.nextLink'] ?? null;
  }

  return NextResponse.json({ success: true, synced: count });
} 