import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'node';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const ok = !!url && !!key;

  let sample = null, db_ok = false, err = null;
  if (ok) {
    try {
      const sb = createClient(url, key, { auth: { persistSession: false } });
      const { data, error } = await sb.from('buildings').select('id,name').limit(1);
      sample = data?.[0] ?? null;
      db_ok = !error;
      err = error?.message ?? null;
    } catch (e: any) {
      err = e?.message ?? String(e);
    }
  }

  return NextResponse.json({ env_ok: ok, db_ok, sample, err });
}
