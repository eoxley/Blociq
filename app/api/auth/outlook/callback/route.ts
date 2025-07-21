import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

/**
 * Helper function to exchange authorization code for tokens
 */
async function getTokenFromCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const tenantId = process.env.OUTLOOK_TENANT_ID || 'common';
  const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
      code: code,
      redirect_uri: process.env.OUTLOOK_REDIRECT_URI!,
      grant_type: 'authorization_code'
    }),
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.text();
    console.error('[Outlook Callback] Token exchange failed:', errorData);
    throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
  }

  const tokenData = await tokenResponse.json();
  
  if (!tokenData.access_token || !tokenData.refresh_token || !tokenData.expires_in) {
    console.error('[Outlook Callback] Missing required tokens from Microsoft response');
    throw new Error('Missing required tokens from Microsoft response');
  }

  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in
  };
}

/**
 * Helper function to get Microsoft user info
 */
async function getMicrosoftUser(accessToken: string): Promise<{ email: string }> {
  const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!userResponse.ok) {
    console.error('[Outlook Callback] Failed to get user info from Microsoft Graph');
    throw new Error(`Failed to get user info: ${userResponse.status} ${userResponse.statusText}`);
  }

  const userData = await userResponse.json();
  const userEmail = userData.mail || userData.userPrincipalName;

  if (!userEmail) {
    console.error('[Outlook Callback] No email found in user data');
    throw new Error('No email found in user data');
  }

  return { email: userEmail };
}

export async function GET(req: NextRequest) {
  try {
    console.log('[Outlook Callback] Starting OAuth callback process');
    
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('[Outlook Callback] OAuth error:', error, errorDescription);
      return NextResponse.redirect(new URL('/inbox?error=outlook_auth_failed', req.url));
    }

    if (!code || !state) {
      console.error('[Outlook Callback] Missing required parameters:', { code: !!code, state: !!state });
      return NextResponse.redirect(new URL('/inbox?error=outlook_missing_params', req.url));
    }

    // Verify state parameter from cookie
    const cookieStore = await cookies();
    const storedState = cookieStore.get('outlook_oauth_state')?.value;

    if (!storedState || storedState !== state) {
      console.error('[Outlook Callback] Invalid state parameter');
      return NextResponse.redirect(new URL('/inbox?error=outlook_invalid_state', req.url));
    }

    // Get authenticated user session
    const supabase = createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('[Outlook Callback] User not authenticated:', sessionError);
      return NextResponse.redirect(new URL('/inbox?error=user_not_authenticated', req.url));
    }

    console.log('[Outlook Callback] User authenticated:', session.user.id);

    // ✅ 1. Exchange the `code` from Outlook OAuth for an access and refresh token
    console.log('[Outlook Callback] Exchanging authorization code for tokens...');
    const tokenData = await getTokenFromCode(code);
    console.log('[Outlook Callback] Token exchange successful');

    // ✅ 2. Fetch the Microsoft user's email via Microsoft Graph `/me` endpoint
    console.log('[Outlook Callback] Fetching user info from Microsoft Graph...');
    const userInfo = await getMicrosoftUser(tokenData.access_token);
    console.log('[Outlook Callback] User info retrieved:', userInfo.email);

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // ✅ 3. Store the token details in the `outlook_tokens` Supabase table
    console.log('[Outlook Callback] Storing tokens in database...');
    const { error: insertError } = await supabase
      .from('outlook_tokens')
      .upsert({
        user_id: session.user.id,
        email: userInfo.email,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt
      }, {
        onConflict: 'user_id,email'
      });

    if (insertError) {
      console.error('[Outlook Callback] Failed to store tokens in database:', insertError);
      return NextResponse.redirect(new URL('/inbox?error=outlook_token_storage_failed', req.url));
    }

    // Clean up the OAuth state cookie
    cookieStore.delete('outlook_oauth_state');

    console.log('[Outlook Callback] Token stored successfully for user:', session.user.id, 'email:', userInfo.email);
    
    // ✅ 6. Redirect to `/inbox` on success (updated from /dashboard/inbox)
    return NextResponse.redirect(new URL(`/inbox?success=outlook_connected&email=${encodeURIComponent(userInfo.email)}`, req.url));

  } catch (error) {
    console.error('[Outlook Callback] Error in Outlook OAuth callback:', error);
    return NextResponse.redirect(new URL('/inbox?error=outlook_callback_failed', req.url));
  }
} 