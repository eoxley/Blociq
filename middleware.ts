import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Handle portal routes
  if (req.nextUrl.pathname.startsWith('/portal/')) {
    const { data: { session } } = await supabase.auth.getSession();

    // If no session, redirect to sign-in
    if (!session) {
      const redirectUrl = new URL('/auth/sign-in', req.url);
      redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Extract leaseholder ID from URL
    const pathParts = req.nextUrl.pathname.split('/');
    const leaseholderId = pathParts[2];

    if (leaseholderId && leaseholderId !== 'help' && leaseholderId !== 'contact') {
      // Verify user has access to this lease
      const { data: lease, error } = await supabase
        .from('leases')
        .select('id, building_id')
        .eq('id', leaseholderId)
        .single();

      if (error || !lease) {
        // Lease not found or access denied
        const errorUrl = new URL('/portal/access-denied', req.url);
        return NextResponse.redirect(errorUrl);
      }

      // Check if user has access to the building
      const { data: buildingAccess } = await supabase
        .from('building_access')
        .select('role')
        .eq('building_id', lease.building_id)
        .eq('user_id', session.user.id)
        .single();

      // Check if user created the building
      const { data: building } = await supabase
        .from('buildings')
        .select('created_by')
        .eq('id', lease.building_id)
        .single();

      const hasAccess = buildingAccess?.role || building?.created_by === session.user.id;

      if (!hasAccess) {
        const errorUrl = new URL('/portal/access-denied', req.url);
        return NextResponse.redirect(errorUrl);
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/portal/:path*'
  ]
};