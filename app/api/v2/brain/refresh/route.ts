import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ ok:false, error:'unauthorised' }, { status: 401 });

  const url = new URL(req.url);
  const reanalyze = url.searchParams.get('reanalyze') === 'true';

  // 1) Trigger existing sync (best effort)
  let synced = false;
  try {
    const syncRes = await fetch(new URL('/api/sync-emails', url.origin), { method: 'POST' });
    synced = syncRes.ok;
  } catch { /* ignore */ }

  // 2) Optionally re-analyse the latest 20 emails via existing endpoint (best effort)
  let reanalysed = 0;
  if (reanalyze) {
    const { data: emails } = await supabase
      .from('incoming_emails')
      .select('id,subject,from_email,from_name,body')
      .eq('user_id', session.user.id)
      .order('received_at', { ascending: false })
      .limit(20);

    if (emails?.length) {
      for (const e of emails) {
        try {
          const r = await fetch(new URL('/api/analyse-email', url.origin), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emailId: e.id,
              subject: e.subject,
              body: e.body,
              fromEmail: e.from_email,
              fromName: e.from_name,
            })
          });
          if (r.ok) reanalysed++;
        } catch { /* ignore individual failures */ }
      }
    }
  }

  return NextResponse.json({ ok: true, synced, reanalysed });
}
