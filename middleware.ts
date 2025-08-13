import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session }
  } = await supabase.auth.getSession()

  const protectedRoutes = ['/home', '/inbox', '/buildings', '/compliance', '/email']

  const path = req.nextUrl.pathname

  // TEMPORARILY DISABLED FOR DEBUGGING
  // Redirect unauthenticated users trying to access protected pages
  // if (protectedRoutes.some((route) => path.startsWith(route))) {
  //   if (!session) {
  //     return NextResponse.redirect(new URL('/login', req.url))
  //   }
  // }

  // Optional: Redirect logged-in users away from /login
  if (path === '/login' && session) {
    return NextResponse.redirect(new URL('/home', req.url))
  }

  return res
}

// Ensure middleware never interferes with /api/* routes
export const config = {
  matcher: ['/((?!api|_next|static|.*\\..*).*)'],
}
