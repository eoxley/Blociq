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

    // Get user profile from the profiles table (handle missing columns gracefully)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*') // Select all available columns
      .eq('id', user.id)
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

export async function PUT(req: NextRequest) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };

  try {
    const supabase = await createClient();

    // Get the current user
    const sessionResult = await supabase.auth.getSession();
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const sessionError = sessionResult?.error || null

    if (sessionError || !session) {
      return NextResponse.json({
        error: 'Authentication required',
        message: 'Please log in to update profile'
      }, { status: 401, headers });
    }

    const user = session.user;
    const body = await req.json();

    // Validate and sanitize update data
    const allowedFields = [
      'first_name', 'last_name', 'job_title', 'company_name',
      'phone_number', 'signature_text', 'signature_url', 'email_signature'
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Update the profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update profile',
        message: updateError.message
      }, { status: 400, headers });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedProfile
    }, { headers });

  } catch (error) {
    console.error('Profile update API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update profile',
      message: 'An unexpected error occurred. Please try again.'
    }, { status: 500, headers });
  }
}
