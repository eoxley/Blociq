import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

// Helper to refresh Outlook access token
async function refreshOutlookToken(tokens: any) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Microsoft OAuth configuration missing');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'https://graph.microsoft.com/.default',
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const tenantId = process.env.AZURE_TENANT_ID || 'common';
  const tokenUrl = process.env.MICROSOFT_TOKEN_URL || `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error_description || 'Failed to refresh Outlook token');
  }

  return await response.json();
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(cookies());
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { title, start_date, end_date, description, location } = body;
    if (!title || !start_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch tokens
    let { data: tokens, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    if (tokenError || !tokens) {
      return NextResponse.json({ error: 'Outlook not connected' }, { status: 404 });
    }

    // Refresh token if expired
    const now = new Date();
    let expiresAt = new Date(tokens.expires_at);
    if (expiresAt <= now) {
      try {
        const refreshed = await refreshOutlookToken(tokens);
        // Update tokens in DB
        const { access_token, refresh_token, expires_in } = refreshed;
        expiresAt = new Date(Date.now() + expires_in * 1000);
        await supabase
          .from('outlook_tokens')
          .update({
            access_token,
            refresh_token,
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', tokens.id);
        tokens.access_token = access_token;
      } catch (refreshError) {
        return NextResponse.json({ error: 'Failed to refresh Outlook token', details: refreshError instanceof Error ? refreshError.message : refreshError }, { status: 401 });
      }
    }

    // Prepare event payload (always include body and location, use Europe/London timezone)
    const eventPayload = {
      subject: title,
      start: {
        dateTime: start_date,
        timeZone: 'Europe/London',
      },
      end: {
        dateTime: end_date || start_date,
        timeZone: 'Europe/London',
      },
      body: {
        contentType: 'text',
        content: description || '',
      },
      location: {
        displayName: location || '',
      },
    };

    // POST to Microsoft Graph
    const graphBaseUrl = process.env.GRAPH_BASE_URL || 'https://graph.microsoft.com/v1.0';
    const response = await fetch(`${graphBaseUrl}/me/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: 'Failed to create Outlook event', details: errorData }, { status: response.status });
    }

    const eventData = await response.json();
    return NextResponse.json({ success: true, event: eventData });
  } catch (error) {
    console.error('Error pushing event to Outlook:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 