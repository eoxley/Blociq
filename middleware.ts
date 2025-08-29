import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const path = req.nextUrl.pathname

  // Check for authentication token in cookies (Edge Runtime compatible)
  const token = req.cookies.get('supabase-auth-token')?.value
  const accessToken = req.cookies.get('sb-access-token')?.value || 
                     req.cookies.get('supabase.auth.token')?.value

  const hasValidSession = Boolean(token || accessToken)
  
  const protectedRoutes = ['/home', '/inbox', '/buildings', '/compliance', '/email']

  // TEMPORARILY DISABLED FOR DEBUGGING
  // Redirect unauthenticated users trying to access protected pages
  // if (protectedRoutes.some((route) => path.startsWith(route))) {
  //   if (!hasValidSession) {
  //     return NextResponse.redirect(new URL('/login', req.url))
  //   }
  // }

  // Optional: Redirect logged-in users away from /login
  if (path === '/login' && hasValidSession) {
    return NextResponse.redirect(new URL('/home', req.url))
  }

  return res
}

// Edge Runtime compatible matcher - exclude API routes and static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - files with extensions (.js, .css, .png, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
