import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-xqxaatvykmaaynqeoemy-auth-token')?.value;
  const { pathname } = request.nextUrl;

  const isProtected = pathname.startsWith('/dashboard');

  if (!token && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}
