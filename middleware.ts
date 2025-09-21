import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Handle portal routes with basic auth check
  if (req.nextUrl.pathname.startsWith('/portal/')) {
    // Check for any Supabase auth cookie patterns
    const allCookies = req.cookies.getAll();

    // Look for common Supabase auth cookie patterns
    const hasAuthCookie = allCookies.some(cookie => {
      const name = cookie.name.toLowerCase();
      return (
        (name.startsWith('sb-') && name.includes('auth')) ||
        name.includes('supabase') ||
        name === 'access_token' ||
        name === 'refresh_token'
      ) && cookie.value && cookie.value.length > 10;
    });

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