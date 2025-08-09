import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

interface OutlookTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  email: string;
}

/**
 * Get an authenticated Microsoft Graph client
 * Throws if user is not authenticated or Outlook is not connected
 */
export async function getOutlookClient() {
  const supabase = createClient(cookies());
  
  // Get current user session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('User not authenticated');
  }

  // Get Outlook tokens
  const { data: tokens, error: tokenError } = await supabase
    .from('outlook_tokens')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (tokenError || !tokens) {
    throw new Error('Outlook not connected. Please connect your Outlook account first.');
  }

  // Check if token is expired and refresh if needed
  const now = new Date();
  const expiresAt = new Date(tokens.expires_at);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt <= fiveMinutesFromNow) {
    // Token is expired or will expire soon, refresh it
    const refreshedTokens = await refreshOutlookToken(tokens);
    return createGraphClient(refreshedTokens.access_token);
  }

  return createGraphClient(tokens.access_token);
}

/**
 * Refresh an expired Outlook access token
 */
async function refreshOutlookToken(tokens: OutlookTokens): Promise<OutlookTokens> {
  const clientId = process.env.OUTLOOK_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = process.env.OUTLOOK_REDIRECT_URI || process.env.MICROSOFT_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Microsoft OAuth configuration missing');
  }

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to refresh token: ${errorData.error_description || response.statusText}`);
  }

  const tokenData = await response.json();

  // Update tokens in database
  const supabase = createClient(cookies());
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User session not found');
  }

  const { error: updateError } = await supabase
    .from('outlook_tokens')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    })
    .eq('user_id', session.user.id);

  if (updateError) {
    console.error('Failed to update tokens in database:', updateError);
    // Continue anyway as we have the new tokens
  }

  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    email: tokens.email,
  };
}

/**
 * Create a Microsoft Graph client with the given access token
 */
function createGraphClient(accessToken: string) {
  return {
    api: (endpoint: string) => ({
      post: async (data: any) => {
        const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Graph API error: ${response.status}`);
        }

        return response.json();
      },
      get: async () => {
        const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Graph API error: ${response.status}`);
        }

        return response.json();
      },
    }),
  };
}
