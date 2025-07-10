import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-xqxaatvykmaaynqeoemy-auth-token')?.value;
  const { pathname } = request.nextUrl;

  // 🔐 Protect /dashboard and children
  const isProtected = pathname.startsWith('/dashboard');

  // 🔒 Not logged in? Redirect to login
  if (!token && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 🔥 IF someone tries to access /dashboard/inbox directly (likely restored)
  if (pathname === '/dashboard/inbox') {
    // Force them to go to /dashboard instead
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 🔁 Redirect authenticated users hitting root to dashboard
  if (token && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}
