import { supabase } from '@/lib/supabaseClient';

export interface OutlookConnectionStatus {
  connected: boolean;
  email?: string;
  tokenExpired?: boolean;
  expiresAt?: string;
  needsReconnect?: boolean;
}

/**
 * Check if the current user has Outlook connected
 */
export async function checkOutlookConnection(): Promise<OutlookConnectionStatus> {
  
  try {
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return { connected: false };
    }

    // Get the user's Outlook tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (tokenError || !tokens) {
      return { connected: false };
    }

    // Check if token is expired or will expire soon (within 5 minutes)
    const now = new Date();
    const expiresAt = new Date(tokens.expires_at);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    const isExpired = expiresAt <= now;
    const willExpireSoon = expiresAt <= fiveMinutesFromNow;

    return {
      connected: true,
      email: tokens.email,
      tokenExpired: isExpired,
      expiresAt: tokens.expires_at,
      needsReconnect: isExpired || willExpireSoon
    };

  } catch (error) {
    console.error('Error checking Outlook connection:', error);
    return { connected: false };
  }
}

/**
 * Refresh Outlook token if needed
 */
export async function refreshOutlookToken(): Promise<boolean> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('No active session');
    }

    // Get current tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (tokenError || !tokens) {
      throw new Error('No Outlook tokens found');
    }

    // Check if token needs refresh (expired or expires within 5 minutes)
    const now = new Date();
    const expiresAt = new Date(tokens.expires_at);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    if (expiresAt > fiveMinutesFromNow) {
      console.log('✅ Token is still valid, no refresh needed');
      return true;
    }

    console.log('🔄 Refreshing Outlook token...');

    // Refresh the token
    const tenantId = process.env.OUTLOOK_TENANT_ID || 'common';
    const refreshResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
      }),
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('❌ Failed to refresh token:', errorText);
      throw new Error('Token refresh failed');
    }

    const refreshData = await refreshResponse.json();
    const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();

    // Update the stored tokens
    const { error: updateError } = await supabase
      .from('outlook_tokens')
      .update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_at: newExpiresAt
      })
      .eq('user_id', session.user.id);

    if (updateError) {
      console.error('❌ Failed to update token in database:', updateError);
      throw new Error('Failed to update token');
    }

    console.log('✅ Token refreshed successfully');
    return true;

  } catch (error) {
    console.error('❌ Error refreshing token:', error);
    return false;
  }
}

/**
 * Get the Microsoft OAuth URL for connecting Outlook
 */
export function getOutlookAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    throw new Error('Microsoft OAuth configuration missing. Please check NEXT_PUBLIC_MICROSOFT_CLIENT_ID and NEXT_PUBLIC_MICROSOFT_REDIRECT_URI environment variables.');
  }

  const scopes = [
    'Calendars.Read',
    'Calendars.ReadWrite',
    'Mail.Read',
    'User.Read'
  ].join(' ');

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes,
    response_mode: 'query'
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Fetch Outlook calendar events for the current user
 */
export async function fetchOutlookEvents() {
  try {
    // First try to refresh token if needed
    const refreshSuccess = await refreshOutlookToken();
    if (!refreshSuccess) {
      throw new Error('Your Outlook session has expired. Please reconnect your account.');
    }

    const response = await fetch('/api/outlook/calendar');
    
    if (!response.ok) {
      const errorData = await response.json();
      // Check if it's a connection issue that should be handled gracefully
      if (errorData.message && (
        errorData.message.includes('Please reconnect') ||
        errorData.message.includes('Outlook not connected') ||
        errorData.message.includes('Token expired') ||
        errorData.message.includes('Token invalid')
      )) {
        throw new Error(errorData.message);
      }
      throw new Error(errorData.message || 'Failed to fetch Outlook events');
    }

    const data = await response.json();
    return data.events || [];

  } catch (error) {
    console.error('Error fetching Outlook events:', error);
    throw error;
  }
} 