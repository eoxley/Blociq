import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        message: 'Please log in to connect Outlook'
      }, { status: 401 });
    }

    console.log('🔗 Initiating Outlook connection for user:', user.email);

    // Check if already connected
    const { data: existingToken } = await supabase
      .from('outlook_tokens')
      .select('email, expires_at')
      .eq('user_id', user.id)
      .single();

    if (existingToken) {
      const now = new Date();
      const expiresAt = new Date(existingToken.expires_at);
      
      if (expiresAt > now) {
        return NextResponse.json({
          success: true,
          message: 'Outlook already connected',
          email: existingToken.email,
          connected: true
        });
      }
    }

    // Generate Microsoft OAuth URL
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
    
    if (!clientId || !redirectUri) {
      return NextResponse.json({
        error: 'Outlook integration not configured',
        message: 'Please configure MICROSOFT_CLIENT_ID and MICROSOFT_REDIRECT_URI environment variables'
      }, { status: 500 });
    }

    const scopes = [
      'Calendars.Read',
      'Calendars.ReadWrite', 
      'Mail.Read',
      'Mail.Send',
      'User.Read',
      'offline_access'
    ].join(' ');

    const state = Math.random().toString(36).substring(2, 15);
    
    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_mode', 'query');

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      message: 'Outlook connection initiated'
    });

  } catch (error) {
    console.error('❌ Error in connect-outlook:', error);
    return NextResponse.json({ 
      error: 'Unexpected error',
      message: 'Failed to initiate Outlook connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 