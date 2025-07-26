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
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const client_id = process.env.OUTLOOK_CLIENT_ID!;
  const client_secret = process.env.OUTLOOK_CLIENT_SECRET!;
  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

  console.log('[exchangeCodeForTokens] Starting token exchange...');
  console.log('[exchangeCodeForTokens] Code:', code);
  console.log('[exchangeCodeForTokens] Client ID:', client_id);
  console.log('[exchangeCodeForTokens] Redirect URI:', redirectUri);

  if (!client_id) {
    throw new Error('OUTLOOK_CLIENT_ID environment variable is not set');
  }

  if (!client_secret) {
    throw new Error('OUTLOOK_CLIENT_SECRET environment variable is not set');
  }

  const params = new URLSearchParams();
  params.append('client_id', client_id);
  params.append('client_secret', client_secret);
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', redirectUri);

  console.log('[exchangeCodeForTokens] Request parameters:', {
    client_id,
    grant_type: 'authorization_code',
    code: code ? 'present' : 'missing',
    redirect_uri: redirectUri
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const data = await response.json();
  console.log('[exchangeCodeForTokens] Microsoft token response:', data);

  if (!response.ok) {
    console.error('[exchangeCodeForTokens] Token exchange failed with status:', response.status);
    console.error('[exchangeCodeForTokens] Error response:', data);
    
    if (response.status === 400) {
      throw new Error(`Microsoft OAuth error (400): ${data.error || 'Bad Request'} - ${data.error_description || 'Invalid request parameters'}`);
    }
    
    throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${data.error || 'Unknown error'}`);
  }

  if (!data.access_token) {
    console.error('[exchangeCodeForTokens] No access_token in response:', data);
    throw new Error('No access_token in Microsoft response');
  }

  console.log('[exchangeCodeForTokens] Token exchange successful');
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
} 