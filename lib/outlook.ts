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
  const client_id = process.env.OUTLOOK_CLIENT_ID!;
  const client_secret = process.env.OUTLOOK_CLIENT_SECRET!;
  const redirect_uri = 'https://www.blociq.co.uk/api/auth/outlook/callback';
  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

  const params = new URLSearchParams({
    client_id,
    client_secret,
    code,
    redirect_uri,
    grant_type: 'authorization_code',
    scope: 'Mail.Read offline_access openid',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const data = await response.json();
  console.log('[exchangeCodeForTokens] Microsoft token response:', data);

  if (!data.access_token) {
    console.error('[exchangeCodeForTokens] No access_token in response:', data);
    throw new Error('No access_token in Microsoft response');
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
} 