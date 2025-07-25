import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

async function refreshOutlookToken(supabase: any, userId: string, refreshToken: string) {
  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
      redirect_uri: process.env.OUTLOOK_REDIRECT_URI!
    });

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Token refresh failed:', errorData);
      throw new Error('Failed to refresh token');
    }

    const tokenData = await response.json();
    
    // Calculate new expiry time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    // Update the tokens in the database
    const { error: updateError } = await supabase
      .from('outlook_tokens')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refreshToken, // Use new refresh token if provided, otherwise keep the old one
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update tokens in database:', updateError);
      throw new Error('Failed to update tokens');
    }

    return {
      access_token: tokenData.access_token,
      expires_at: expiresAt.toISOString()
    };
  } catch (error) {
    console.error('Error refreshing Outlook token:', error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the user's Outlook tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (tokenError || !tokens) {
      return NextResponse.json({ 
        error: 'Outlook not connected',
        message: 'Please connect your Outlook account to view calendar events'
      }, { status: 404 });
    }

    let accessToken = tokens.access_token;
    let expiresAt = tokens.expires_at;

    // Check if token is expired and refresh if necessary
    const now = new Date();
    const tokenExpiresAt = new Date(tokens.expires_at);
    const isExpired = tokenExpiresAt <= now;

    if (isExpired) {
      try {
        console.log('Outlook token expired, attempting to refresh...');
        const refreshedTokens = await refreshOutlookToken(supabase, session.user.id, tokens.refresh_token);
        accessToken = refreshedTokens.access_token;
        expiresAt = refreshedTokens.expires_at;
        console.log('Token refreshed successfully');
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        return NextResponse.json({ 
          error: 'Outlook session expired',
          message: 'Your Outlook session has expired. Please reconnect your account.'
        }, { status: 401 });
      }
    }

    // Fetch upcoming events from Microsoft Graph API
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/me/calendar/events?$orderby=start/dateTime&$top=10&$select=id,subject,body,location,start,end,isAllDay,organizer,attendees,importance,showAs,categories,webLink,onlineMeeting,createdDateTime,lastModifiedDateTime',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Microsoft Graph API error:', errorData);
      
      // If we get a 401 with a refreshed token, the refresh token might be invalid
      if (response.status === 401 && isExpired) {
        return NextResponse.json({ 
          error: 'Outlook session expired',
          message: 'Your Outlook session has expired. Please reconnect your account.'
        }, { status: 401 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch calendar events',
        details: errorData
      }, { status: response.status });
    }

    const data = await response.json();
    const events = data.value || [];

    // Transform events to match our expected format
    const transformedEvents = events.map((event: any) => ({
      id: event.id,
      subject: event.subject || 'No Subject',
      title: event.subject || 'No Subject', // For consistency with our existing event format
      description: event.body?.content || null,
      location: event.location?.displayName || null,
      start_time: event.start?.dateTime,
      end_time: event.end?.dateTime,
      is_all_day: event.isAllDay || false,
      organiser: event.organizer?.emailAddress?.address || null,
      organiser_name: event.organizer?.emailAddress?.name || null,
      attendees: event.attendees || [],
      importance: event.importance || 'normal',
      show_as: event.showAs || 'busy',
      categories: event.categories || [],
      web_link: event.webLink || null,
      online_meeting: event.onlineMeeting || null,
      created_at: event.createdDateTime || null,
      modified_at: event.lastModifiedDateTime || null,
      event_type: 'outlook' as const,
      source: 'outlook'
    }));

    return NextResponse.json({ 
      events: transformedEvents,
      total: transformedEvents.length,
      source: 'outlook'
    });

  } catch (error) {
    console.error('Error fetching Outlook calendar events:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 