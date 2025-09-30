import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { email, name } = body;

    if (!email || !name) {
      return NextResponse.json({
        error: 'Email and name are required'
      }, { status: 400 });
    }

    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Verify user has permission to invite leaseholders (manager/staff)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, agency_id')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || !['manager', 'staff'].includes(profile.role)) {
      return NextResponse.json({
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    // Get leaseholder details
    const { data: leaseholder, error: leaseholderError } = await supabase
      .from('leaseholders')
      .select(`
        id,
        full_name,
        email,
        unit_id,
        units!inner(
          unit_number,
          buildings!inner(id, name, address, agency_id)
        )
      `)
      .eq('id', params.id)
      .single();

    if (leaseholderError || !leaseholder) {
      return NextResponse.json({
        error: 'Leaseholder not found'
      }, { status: 404 });
    }

    // Verify leaseholder belongs to user's agency
    if (leaseholder.units.buildings.agency_id !== profile.agency_id) {
      return NextResponse.json({
        error: 'Access denied'
      }, { status: 403 });
    }

    // Check if user already exists with this email
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', email)
      .single();

    if (existingUser) {
      if (existingUser.role === 'leaseholder') {
        return NextResponse.json({
          error: 'User with this email already has a leaseholder account'
        }, { status: 409 });
      } else {
        return NextResponse.json({
          error: 'User with this email already has a staff account'
        }, { status: 409 });
      }
    }

    // Create user account using Supabase Auth Admin
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      email_confirm: true, // Auto-confirm email for invitations
      user_metadata: {
        full_name: name,
        invited_by: session.user.id,
        leaseholder_id: params.id
      }
    });

    if (authError || !authUser.user) {
      console.error('Error creating user:', authError);
      return NextResponse.json({
        error: 'Failed to create user account',
        message: authError?.message
      }, { status: 500 });
    }

    // Create profile with leaseholder role
    const { error: profileCreateError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email: email,
        full_name: name,
        role: 'leaseholder',
        agency_id: profile.agency_id
      });

    if (profileCreateError) {
      console.error('Error creating profile:', profileCreateError);
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({
        error: 'Failed to create user profile',
        message: profileCreateError.message
      }, { status: 500 });
    }

    // Link user to leaseholder
    const { error: linkError } = await supabase
      .from('leaseholder_users')
      .insert({
        user_id: authUser.user.id,
        leaseholder_id: params.id
      });

    if (linkError) {
      console.error('Error linking user to leaseholder:', linkError);
      return NextResponse.json({
        error: 'Failed to link user to leaseholder',
        message: linkError.message
      }, { status: 500 });
    }

    // Enable portal access for leaseholder
    const { error: updateError } = await supabase
      .from('leaseholders')
      .update({
        portal_enabled: true,
        email: email
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Error enabling portal access:', updateError);
      // Continue anyway as the main functionality is working
    }

    // Generate magic link for first-time login
    const { data: magicLink, error: linkGenError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/portal/${params.id}`
      }
    });

    if (linkGenError || !magicLink.properties?.action_link) {
      console.error('Error generating magic link:', linkGenError);
      return NextResponse.json({
        error: 'Failed to generate login link',
        message: linkGenError?.message
      }, { status: 500 });
    }

    // TODO: Send email with magic link
    // For now, return the link in the response
    return NextResponse.json({
      success: true,
      message: 'Leaseholder invited successfully',
      user_id: authUser.user.id,
      magic_link: magicLink.properties.action_link,
      portal_url: `/portal/${params.id}`,
      leaseholder: {
        id: leaseholder.id,
        name: leaseholder.full_name,
        email: email,
        unit: leaseholder.units.unit_number,
        building: leaseholder.units.buildings.name
      }
    });

  } catch (error) {
    console.error('Error in leaseholder invite:', error);
    return NextResponse.json({
      error: 'Failed to invite leaseholder',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}
