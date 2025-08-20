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

    // Get user profile with signature from users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('first_name, last_name, job_title, signature_text, signature_url, email_signature')
      .eq('email', user.email)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // Build full signature combining text and image
    let fullSignature = '';
    
    // Add typed signature if available
    if (profile?.signature_text) {
      fullSignature += profile.signature_text;
    }
    
    // Add email signature template if available
    if (profile?.email_signature) {
      if (fullSignature) fullSignature += '\n\n';
      fullSignature += profile.email_signature;
    }
    
    // If no custom signature, create a default one
    if (!fullSignature) {
      const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
      const jobTitle = profile?.job_title || '';
      
      fullSignature = `Best regards,\n\n${fullName || user.email}`;
      if (jobTitle) {
        fullSignature += `\n${jobTitle}`;
      }
    }

    // Add signature image if available
    const signatureImage = profile?.signature_url;

    return NextResponse.json({
      success: true,
      signature: fullSignature,
      signatureText: profile?.signature_text || '',
      signatureImage: signatureImage || null,
      emailSignature: profile?.email_signature || '',
      fullName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user.email,
      jobTitle: profile?.job_title || '',
      email: user.email
    });

  } catch (error) {
    console.error('❌ Error in get-signature API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 