import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // ✅ This is the correct Supabase auth cookie name for your project
  const token = (await request.cookies.get('sb-xqxaatvykmaaynqeoemy-auth-token'))?.value;

  // ✅ Define which paths you want to protect
  const protectedPaths = ['/dashboard', '/dashboard/inbox'];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // 🔒 If not logged in and accessing protected route, redirect to /login
  if (!token && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}
