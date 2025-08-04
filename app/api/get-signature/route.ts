import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with signature
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, signature')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // Return signature or default signature
    const signature = profile?.signature || `\n\nBest regards,\n${profile?.full_name || user.email}`;

    return NextResponse.json({
      success: true,
      signature,
      fullName: profile?.full_name || user.email,
      email: user.email
    });

  } catch (error) {
    console.error('❌ Error in get-signature API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 