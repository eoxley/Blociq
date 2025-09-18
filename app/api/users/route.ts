import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  // Fix 406 by setting proper headers
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };

  try {
    const supabase = await createClient();
    
    // Get the current user - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
    const sessionResult = await supabase.auth.getSession();
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const sessionError = sessionResult?.error || null
    
    if (sessionError || !session) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to view user data'
      }, { status: 401, headers });
    }

    const user = session.user;

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
      }, { headers });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        profile: profile
      }
    }, { headers });

  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user data',
      message: 'An unexpected error occurred. Please try again.'
    }, { status: 500, headers });
  }
}
