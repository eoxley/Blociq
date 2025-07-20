import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error, errorDescription);
      return NextResponse.redirect(new URL('/dashboard/inbox?error=outlook_auth_failed', req.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/dashboard/inbox?error=outlook_missing_params', req.url));
    }

    // Verify state parameter from cookie
    const cookieStore = await cookies();
    const storedState = cookieStore.get('outlook_oauth_state')?.value;

    if (!storedState || storedState !== state) {
      console.error('Invalid state parameter');
      return NextResponse.redirect(new URL('/dashboard/inbox?error=outlook_invalid_state', req.url));
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.OUTLOOK_CLIENT_ID!,
        client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
        code: code,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/outlook/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(new URL('/dashboard/inbox?error=outlook_token_failed', req.url));
    }

    const tokenData = await tokenResponse.json();

    // For now, store tokens in cookies (in production, use database)
    // This is a temporary solution until the user_tokens table is set up
    cookieStore.set('outlook_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in // Use the actual expiry time
    });

    if (tokenData.refresh_token) {
      cookieStore.set('outlook_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 // 30 days for refresh token
      });
    }

    // Clean up the OAuth state cookie
    cookieStore.delete('outlook_oauth_state');

    console.log('Outlook OAuth completed successfully');
    
    // Redirect back to inbox with success message
    return NextResponse.redirect(new URL('/dashboard/inbox?success=outlook_connected', req.url));

  } catch (error) {
    console.error('Error in Outlook OAuth callback:', error);
    return NextResponse.redirect(new URL('/dashboard/inbox?error=outlook_callback_failed', req.url));
  }
} 