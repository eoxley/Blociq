import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to view user data'
      }, { status: 401 });
    }

    // Get user profile from the users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, full_name, job_title, company_name, phone_number, created_at, updated_at')
      .eq('email', user.email)
      .single();

    if (profileError) {
      // If no profile found, return basic user info
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          profile: null
        }
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        profile: profile
      }
    });

  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user data',
      message: 'An unexpected error occurred. Please try again.'
    }, { status: 500 });
  }
}
