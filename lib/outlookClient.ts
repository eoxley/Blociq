import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { Client } from '@microsoft/microsoft-graph-client';

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
    const e: any = new Error('User not authenticated');
    e.status = 401;
    throw e;
  }

  // Get Outlook tokens
  const { data: tokens, error: tokenError } = await supabase
    .from('outlook_tokens')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (tokenError || !tokens) {
    const e: any = new Error('Outlook not connected. Please connect your Outlook account first.');
    e.status = 401;
    throw e;
  }

  // Check if token is expired and refresh if needed
  const now = new Date();
  const expiresAt = new Date(tokens.expires_at);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  let accessToken = tokens.access_token;

  if (expiresAt <= fiveMinutesFromNow) {
    // Token is expired or will expire soon, refresh it
    const refreshedTokens = await refreshOutlookToken(tokens);
    accessToken = refreshedTokens.access_token;
  }

  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
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

const WELL_KNOWN: Record<string, string> = {
  // leave values empty; we'll resolve these once and cache in memory per lambda
  inbox: '',
  archive: '',
  deleted: '',
  sentitems: '',
};

let folderCache: Record<string, string> | null = null;

/**
 * Ensure we have a valid folder ID, mapping well-known aliases to actual folder IDs
 */
export async function ensureFolderId(client: any, folderIdOrAlias: string): Promise<string> {
  // If it already looks like an ID (guid-ish), return as-is
  if (/^[a-zA-Z0-9\-_]+$/.test(folderIdOrAlias) && folderIdOrAlias.length > 12) {
    return folderIdOrAlias;
  }

  // Resolve well-known aliases → id by listing folders once and caching
  if (!folderCache) {
    folderCache = {};
    try {
      const res = await client.api('/me/mailFolders').select('id,displayName,wellKnownName').top(200).get();
      for (const f of res?.value || []) {
        if (f.wellKnownName) folderCache[f.wellKnownName.toLowerCase()] = f.id;
        if (f.displayName) folderCache[f.displayName.toLowerCase()] = f.id;
      }
    } catch (error) {
      console.error('Failed to fetch mail folders:', error);
      throw new Error('Failed to fetch mail folders');
    }
  }

  const key = folderIdOrAlias.toLowerCase();
  const id = folderCache[key] || WELL_KNOWN[key];
  if (!id) {
    // As a last resort, re-fetch
    folderCache = null;
    return ensureFolderId(client, folderIdOrAlias);
  }
  return id;
}
