import { supabase } from '@/lib/supabaseClient';

export interface OutlookConnectionStatus {
  connected: boolean;
  email?: string;
  tokenExpired?: boolean;
  expiresAt?: string;
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

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokens.expires_at);
    const isExpired = expiresAt <= now;

    return {
      connected: true,
      email: tokens.email,
      tokenExpired: isExpired,
      expiresAt: tokens.expires_at
    };

  } catch (error) {
    console.error('Error checking Outlook connection:', error);
    return { connected: false };
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