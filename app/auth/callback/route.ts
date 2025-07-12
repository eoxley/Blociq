import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  console.log('[Callback] Received redirect:', requestUrl.href);

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  });

  console.log('[Callback] Attempting session exchange...');
  const { data, error } = await supabase.auth.exchangeCodeForSession(requestUrl);

  if (error) {
    console.error('[Callback] Session exchange failed:', error.message);
    return NextResponse.redirect('http://localhost:3000/login?error=session');
  }

  console.log('[Callback] Session exchange succeeded:', data.session?.user?.email || 'no email');
  return NextResponse.redirect('http://localhost:3000/');
}
