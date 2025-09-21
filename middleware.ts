import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Handle portal routes with basic auth check
  if (req.nextUrl.pathname.startsWith('/portal/')) {
    // Get the project ref from the environment to build the correct cookie name
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let projectRef = '';

    if (supabaseUrl) {
      // Extract project ref from Supabase URL
      const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
      if (urlMatch) {
        projectRef = urlMatch[1];
      }
    }

    // Check for Supabase auth cookies (multiple possible names)
    const possibleCookieNames = [
      `sb-${projectRef}-auth-token`,
      'sb-access-token',
      'sb-refresh-token',
      'supabase-auth-token',
      'supabase.auth.token'
    ];

    let hasAuthCookie = false;
    for (const cookieName of possibleCookieNames) {
      if (req.cookies.get(cookieName)?.value) {
        hasAuthCookie = true;
        break;
      }
    }

    // Also check for any cookie that starts with 'sb-' and contains 'auth'
    if (!hasAuthCookie) {
      const allCookies = req.cookies.getAll();
      hasAuthCookie = allCookies.some(cookie =>
        cookie.name.startsWith('sb-') && cookie.name.includes('auth') && cookie.value
      );
    }

    // If no auth token found, redirect to sign-in
    if (!hasAuthCookie) {
      const redirectUrl = new URL('/auth/sign-in', req.url);
      redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // For more complex authorization (building access, etc.),
    // we'll handle it client-side or in API routes since Edge Runtime
    // has limited capabilities for database queries
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/portal/:path*'
  ]
};