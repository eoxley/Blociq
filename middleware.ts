import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-xqxaatvykmaaynqeoemy-auth-token')?.value;
  const { pathname } = request.nextUrl;

  // 🔐 Protect /dashboard and all its subpaths
  const isProtected = pathname.startsWith('/dashboard');

  // 🔒 Redirect unauthenticated users to /login
  if (!token && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 🚪 Redirect logged-in users who hit "/" to "/dashboard"
  if (token && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // ✅ Otherwise allow request through
  return NextResponse.next();
}
