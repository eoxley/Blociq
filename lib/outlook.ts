/**
 * Helper function to exchange authorization code for tokens
 */
export async function getAccessTokenFromCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const tenantId = process.env.AZURE_TENANT_ID || '6c00dc8f-a9ab-4339-a17d-437869997312';
  const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!.trim(),
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!.trim(),
      code: code,
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI!.trim(),
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
export async function exchangeCodeForTokens(code: string) {
  // Validate environment variables
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
  
  if (!clientId) {
    throw new Error('MICROSOFT_CLIENT_ID environment variable is not set');
  }
  if (!clientSecret) {
    throw new Error('MICROSOFT_CLIENT_SECRET environment variable is not set');
  }
  if (!redirectUri) {
    throw new Error('MICROSOFT_REDIRECT_URI environment variable is not set');
  }
  
  const params = new URLSearchParams();
  params.append('client_id', clientId.trim());
  params.append('client_secret', clientSecret.trim());
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', redirectUri.trim());

  console.log("🚀 Sending token exchange with:", params.toString());

  const tenantId = process.env.AZURE_TENANT_ID || '6c00dc8f-a9ab-4339-a17d-437869997312';
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await res.json();
  console.log("📥 Microsoft token response:", data);

  if (!res.ok || !data.access_token) {
    throw new Error(`Microsoft OAuth error (${res.status}): ${data.error} - ${data.error_description}`);
  }

  return data;
} 