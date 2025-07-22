import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  console.log('[Callback] Received redirect:', requestUrl.href);

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  });

  // Check if this is a Microsoft OAuth callback
  const code = requestUrl.searchParams.get('code');
  const oauthError = requestUrl.searchParams.get('error');

  if (oauthError) {
    console.error('[Callback] Microsoft OAuth error:', oauthError);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login?error=microsoft_oauth`);
  }

  if (code) {
    // This is a Microsoft OAuth callback
    console.log('[Callback] Processing Microsoft OAuth callback...');
    
    try {
      // Exchange authorization code for tokens
      const tokenResponse = await exchangeCodeForTokens(code);
      console.log('[Callback] Token exchange successful');

      // Get user info from Microsoft Graph
      const userInfo = await getUserInfo(tokenResponse.access_token);
      console.log('[Callback] User info retrieved:', userInfo.email);

      // For Microsoft OAuth, we'll handle the user creation differently
      // First, try to get the current user session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      let userId = user?.id;
      
      if (!userId) {
        // If no user session, create a new user or sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithOAuth({
          provider: 'azure',
          options: {
            scopes: 'openid profile email',
            queryParams: {
              access_token: tokenResponse.access_token,
              refresh_token: tokenResponse.refresh_token
            }
          }
        });

        if (signInError) {
          console.error('[Callback] Supabase auth error:', signInError);
          return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login?error=supabase_auth`);
        }
        
        // Get the user ID from the sign-in response
        const { data: { user: newUser } } = await supabase.auth.getUser();
        userId = newUser?.id;
      }

      // Save Microsoft tokens to Supabase
      const { error: tokenError } = await supabase
        .from('outlook_tokens')
        .upsert({
          user_id: userId || userInfo.id,
          email: userInfo.email,
          access_token: tokenResponse.access_token,
          refresh_token: tokenResponse.refresh_token,
          expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (tokenError) {
        console.error('[Callback] Token save error:', tokenError);
        // Continue anyway as the user is authenticated
      }

      console.log('[Callback] Microsoft OAuth flow completed successfully');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/inbox`);

    } catch (error) {
      console.error('[Callback] Microsoft OAuth processing error:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login?error=token_exchange`);
    }
  }

  // Handle regular Supabase auth callback
  console.log('[Callback] Attempting Supabase session exchange...');
  const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(requestUrl.searchParams.toString());

  if (sessionError) {
    console.error('[Callback] Session exchange failed:', sessionError.message);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login?error=session`);
  }

  console.log('[Callback] Session exchange succeeded:', data.session?.user?.email || 'no email');
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/inbox`);
}

async function exchangeCodeForTokens(code: string): Promise<MicrosoftTokenResponse> {
  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
  const redirectUri = "https://www.blociq.co.uk/auth/callback";

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured');
  }

  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Callback] Token exchange failed:', errorText);
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return await response.json();
}

async function getUserInfo(accessToken: string): Promise<{ id: string; email: string; name: string }> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  const userData = await response.json();
  return {
    id: userData.id,
    email: userData.mail || userData.userPrincipalName,
    name: userData.displayName
  };
}
