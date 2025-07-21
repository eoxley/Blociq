import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    // Microsoft OAuth 2.0 configuration
    const clientId = process.env.OUTLOOK_CLIENT_ID;
    const redirectUri = process.env.OUTLOOK_REDIRECT_URI;
    const scope = 'Calendars.ReadWrite offline_access';
    
    if (!clientId) {
      console.error('OUTLOOK_CLIENT_ID not configured');
      return NextResponse.json({ error: 'Outlook integration not configured' }, { status: 500 });
    }

    if (!redirectUri) {
      console.error('OUTLOOK_REDIRECT_URI not configured');
      return NextResponse.json({ error: 'Outlook redirect URI not configured' }, { status: 500 });
    }

    // Generate state parameter for security
    const state = Math.random().toString(36).substring(2, 15);
    
    // Store state in a cookie for verification (simpler than database)
    const cookieStore = await cookies();
    cookieStore.set('outlook_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    });

    // Build the Microsoft OAuth URL
    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_mode', 'query');

    console.log('Redirecting to Microsoft OAuth:', authUrl.toString());
    
    return NextResponse.redirect(authUrl.toString());

  } catch (error) {
    console.error('Error in Outlook OAuth:', error);
    return NextResponse.json({ error: 'Failed to initiate Outlook connection' }, { status: 500 });
  }
} 