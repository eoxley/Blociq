import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    console.log('[Microsoft OAuth] Starting Microsoft authentication...');
    
    // Microsoft OAuth 2.0 configuration
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'https://www.blociq.co.uk/auth/callback';
    const scopes = [
      'openid',
      'profile', 
      'email',
      'offline_access',
      'Mail.Read',
      'Mail.Send',
      'Calendars.ReadWrite'
    ].join(' ');
    
    console.log('[Microsoft OAuth] Environment check:', {
      clientId: !!clientId,
      redirectUri: redirectUri,
      scopes: scopes
    });
    
    if (!clientId) {
      console.error('[Microsoft OAuth] MICROSOFT_CLIENT_ID not configured');
      return NextResponse.json({ error: 'Microsoft authentication not configured' }, { status: 500 });
    }

    // Generate state parameter for security
    const state = Math.random().toString(36).substring(2, 15);
    console.log('[Microsoft OAuth] Generated state:', state);
    
    // Store state in a cookie for verification
    const cookieStore = await cookies();
    cookieStore.set('microsoft_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    });
    console.log('[Microsoft OAuth] State cookie set');

    // Build the Microsoft OAuth URL
    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_mode', 'query');

    console.log('[Microsoft OAuth] Redirecting to Microsoft OAuth:', authUrl.toString());
    console.log('[Microsoft OAuth] Full URL parameters:', {
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state: state
    });
    
    return NextResponse.redirect(authUrl.toString());

  } catch (error) {
    console.error('[Microsoft OAuth] Error in Microsoft OAuth initiation:', error);
    return NextResponse.json({ error: 'Failed to initiate Microsoft authentication' }, { status: 500 });
  }
} 