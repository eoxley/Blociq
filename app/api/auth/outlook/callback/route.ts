import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { exchangeCodeForTokens } from '@/lib/outlook';
import { saveUserOutlookTokens } from '@/lib/outlookAuth';

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

    console.log('[Outlook Callback] Code param received:', code);

    // Verify state parameter from cookie
    const cookieStore = await cookies();
    const storedState = cookieStore.get('outlook_oauth_state')?.value;
    console.log('[Outlook Callback] Cookie store:', JSON.stringify(cookieStore.getAll()));
    console.log('[Outlook Callback] Received state:', state, 'Stored state:', storedState);

    if (!storedState || storedState !== state) {
      console.error('[Outlook Callback] Invalid state parameter');
      return NextResponse.redirect(new URL('/inbox?error=outlook_invalid_state', req.url));
    }

    // Get authenticated user session (try getUser instead of getSession)
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('[Outlook Callback] getUser result:', user, userError);
    
    if (userError || !user) {
      console.error('[Outlook Callback] User not authenticated:', userError);
      return NextResponse.redirect(new URL('/inbox?error=user_not_authenticated', req.url));
    }

    console.log('[Outlook Callback] User authenticated:', user.id);

    // ✅ 1. Exchange the `code` from Outlook OAuth for an access and refresh token
    console.log('[Outlook Callback] Exchanging authorization code for tokens...');
    const tokenData = await exchangeCodeForTokens(code);
    console.log('[Outlook Callback] Token response:', tokenData);

    // ✅ 2. Fetch the Microsoft user's email via Microsoft Graph `/me` endpoint
    console.log('[Outlook Callback] Fetching user info from Microsoft Graph...');
    const userInfo = await getMicrosoftUser(tokenData.access_token);
    console.log('[Outlook Callback] User info retrieved:', userInfo.email);

    // ✅ 3. Call saveOutlookTokens with the required parameters
    console.log('[Outlook Callback] Saving tokens to database...');
    await saveUserOutlookTokens(
      'testbloc@blociq.co.uk', // user_email as specified
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in
    );

    // Clean up the OAuth state cookie
    cookieStore.delete('outlook_oauth_state');

    console.log('[Outlook Callback] Token stored successfully for user:', user.id, 'email: testbloc@blociq.co.uk');
    
    // ✅ 4. Redirect to `/` on success
    return NextResponse.redirect(new URL('/', req.url));

  } catch (error) {
    console.error('[Outlook Callback] Callback error:', error);
    return NextResponse.redirect(new URL('/inbox?error=outlook_callback_failed', req.url));
  }
} 