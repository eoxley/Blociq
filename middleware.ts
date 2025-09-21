import { NextResponse } from 'next/server'

export function middleware(req) {
  // Handle portal routes with basic auth check
  if (req.nextUrl.pathname.startsWith('/portal/')) {
    // Check for any auth-related cookies
    const cookies = req.cookies.getAll();
    const hasAuthCookie = cookies.some(cookie =>
      cookie.name.includes('sb-') ||
      cookie.name.includes('supabase') ||
      cookie.name.includes('auth')
    );

    // If no auth token found, redirect to sign-in
    if (!hasAuthCookie) {
      const redirectUrl = new URL('/auth/sign-in', req.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/portal/:path*'
  ]
};