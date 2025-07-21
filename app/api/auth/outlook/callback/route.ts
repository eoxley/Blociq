import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

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

    // Get authenticated user session
    const supabase = createClient(cookieStore);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('User not authenticated');
      return NextResponse.redirect(new URL('/dashboard/inbox?error=user_not_authenticated', req.url));
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

    // Get user's email from Microsoft Graph API
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to get user info from Microsoft Graph');
      return NextResponse.redirect(new URL('/dashboard/inbox?error=outlook_user_info_failed', req.url));
    }

    const userData = await userResponse.json();
    const userEmail = userData.mail || userData.userPrincipalName;

    if (!userEmail) {
      console.error('No email found in user data');
      return NextResponse.redirect(new URL('/dashboard/inbox?error=outlook_no_email', req.url));
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Store tokens securely in Supabase
    const { error: insertError } = await supabase
      .from('outlook_tokens')
      .upsert({
        user_id: session.user.id,
        email: userEmail,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt
      }, {
        onConflict: 'user_id,email'
      });

    if (insertError) {
      console.error('Failed to store tokens in database:', insertError);
      return NextResponse.redirect(new URL('/dashboard/inbox?error=outlook_token_storage_failed', req.url));
    }

    // Clean up the OAuth state cookie
    cookieStore.delete('outlook_oauth_state');

    console.log('Outlook OAuth completed successfully for user:', session.user.id);
    
    // Redirect back to inbox with success message
    return NextResponse.redirect(new URL('/dashboard/inbox?success=outlook_connected', req.url));

  } catch (error) {
    console.error('Error in Outlook OAuth callback:', error);
    return NextResponse.redirect(new URL('/dashboard/inbox?error=outlook_callback_failed', req.url));
  }
} 