import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        // Profile doesn't exist
        return NextResponse.json({ signature: null });
      }
      throw profileError;
    }

    // Return signature data
    const signatureData = {
      first_name: profile.first_name,
      last_name: profile.last_name,
      job_title: profile.job_title,
      company_name: profile.company_name,
      phone_number: profile.phone_number,
      email: profile.email,
      signature_text: profile.signature_text,
      signature_url: profile.signature_url
    };

    return NextResponse.json({ signature: signatureData });
  } catch (error) {
    console.error('Error fetching user signature:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signature' }, 
      { status: 500 }
    );
  }
}
