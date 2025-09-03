import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        message: 'Please log in to check status'
      }, { status: 401 });
    }

    console.log('🔍 Debugging Outlook status for user:', user.email);

    // Check Outlook token status
    const { data: token, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const tokenStatus = {
      exists: !!token,
      email: token?.email || null,
      expiresAt: token?.expires_at || null,
      isExpired: token ? new Date(token.expires_at) <= new Date() : null,
      error: tokenError?.message || null
    };

    // Check email count
    const { data: emails, error: emailsError, count } = await supabase
      .from('incoming_emails')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    const emailStatus = {
      count: count || 0,
      emails: emails?.slice(0, 5) || [], // Show first 5 emails
      error: emailsError?.message || null
    };

    // Check environment variables
    const envStatus = {
      MICROSOFT_CLIENT_ID: !!process.env.MICROSOFT_CLIENT_ID,
      MICROSOFT_CLIENT_SECRET: !!process.env.MICROSOFT_CLIENT_SECRET,
      MICROSOFT_REDIRECT_URI: !!process.env.MICROSOFT_REDIRECT_URI,
      AZURE_TENANT_ID: process.env.AZURE_TENANT_ID || 'common'
    };

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      tokenStatus,
      emailStatus,
      envStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in debug-outlook-status:', error);
    return NextResponse.json({ 
      error: 'Unexpected error',
      message: 'Failed to check status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 