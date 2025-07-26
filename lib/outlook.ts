/**
 * Helper function to exchange authorization code for tokens
 */
export async function getAccessTokenFromCode(code: string): Promise<{
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
    console.error('[Outlook Lib] Token exchange failed:', errorData);
    throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
  }

  const tokenData = await tokenResponse.json();
  
  if (!tokenData.access_token || !tokenData.refresh_token || !tokenData.expires_in) {
    console.error('[Outlook Lib] Missing required tokens from Microsoft response');
    throw new Error('Missing required tokens from Microsoft response');
  }

  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in
  };
}

/**
 * Exchange authorization code for tokens with enhanced logging
 */
export async function exchangeCodeForTokens(code: string): Promise<{
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

  const data = await tokenResponse.json();
  console.log('Token response:', data);

  if (!tokenResponse.ok) {
    console.error('Token exchange failed:', data);
    throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
  }

  if (data.error || !data.access_token) {
    console.error('Invalid token response:', data);
    throw new Error(`Invalid token response: ${data.error || 'Missing access_token'}`);
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in
  };
}

/**
 * Exchange authorization code for tokens using PKCE
 */
export async function exchangeCodeForTokensWithPkce(code: string, verifier: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const client_id = process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID!;
  const redirect_uri = 'https://www.blociq.co.uk/api/auth/outlook/callback';
  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

  console.log('[exchangeCodeForTokensWithPkce] Starting PKCE token exchange...');
  console.log('[exchangeCodeForTokensWithPkce] Code:', code);
  console.log('[exchangeCodeForTokensWithPkce] Verifier:', verifier);
  console.log('[exchangeCodeForTokensWithPkce] Client ID:', client_id);
  console.log('[exchangeCodeForTokensWithPkce] Redirect URI:', redirect_uri);

  if (!client_id) {
    throw new Error('NEXT_PUBLIC_OUTLOOK_CLIENT_ID environment variable is not set');
  }

  const params = new URLSearchParams({
    client_id,
    grant_type: 'authorization_code',
    code,
    redirect_uri,
    code_verifier: verifier,
  });

  console.log('[exchangeCodeForTokensWithPkce] Request parameters:', {
    client_id,
    grant_type: 'authorization_code',
    code: code ? 'present' : 'missing',
    redirect_uri,
    code_verifier: verifier ? 'present' : 'missing'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const data = await response.json();
  console.log('[exchangeCodeForTokensWithPkce] Microsoft token response:', data);

  if (!response.ok) {
    console.error('[exchangeCodeForTokensWithPkce] Token exchange failed with status:', response.status);
    console.error('[exchangeCodeForTokensWithPkce] Error response:', data);
    
    if (response.status === 400) {
      throw new Error(`Microsoft OAuth error (400): ${data.error || 'Bad Request'} - ${data.error_description || 'Invalid request parameters'}`);
    }
    
    throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${data.error || 'Unknown error'}`);
  }

  if (!data.access_token) {
    console.error('[exchangeCodeForTokensWithPkce] No access_token in response:', data);
    throw new Error('No access_token in Microsoft response');
  }

  console.log('[exchangeCodeForTokensWithPkce] Token exchange successful');
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
} 