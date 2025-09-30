import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Get the current user session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  // Check if the request is for a portal route
  if (req.nextUrl.pathname.startsWith('/portal/')) {
    
    // If no session, redirect to sign-in
    if (!session?.user) {
      const redirectUrl = new URL('/auth/sign-in', req.url);
      redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    try {
      // Get user profile to check role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile) {
        // No profile found, redirect to access denied
        return NextResponse.redirect(new URL('/portal/access-denied', req.url));
      }

      // Check if user has portal access (leaseholder or director)
      if (!['leaseholder', 'director'].includes(profile.role)) {
        // User doesn't have portal access
        return NextResponse.redirect(new URL('/portal/access-denied', req.url));
      }

      // For leaseholder users, verify they have access to the specific lease
      if (profile.role === 'leaseholder') {
        const pathParts = req.nextUrl.pathname.split('/');
        const leaseholderId = pathParts[2]; // /portal/[leaseholderId]/...
        
        if (leaseholderId) {
          // Check if this leaseholder user has access to this specific lease
          const { data: hasAccess, error: accessError } = await supabase
            .rpc('portal_has_lease_access', {
              user_id: session.user.id,
              lease_id: leaseholderId
            });

          if (accessError || !hasAccess) {
            return NextResponse.redirect(new URL('/portal/access-denied', req.url));
          }
        }
      }

      // For directors, they can access any portal route (will be checked at page level)
      
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.redirect(new URL('/portal/access-denied', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/portal/:path*',
  ],
};
