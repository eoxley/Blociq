import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

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

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokens.expires_at);
    const isExpired = expiresAt <= now;

    if (isExpired) {
      return NextResponse.json({ 
        error: 'Outlook token expired',
        message: 'Please reconnect your Outlook account'
      }, { status: 401 });
    }

    // Fetch upcoming events from Microsoft Graph API
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/me/calendar/events?$orderby=start/dateTime&$top=10&$select=id,subject,body,location,start,end,isAllDay,organizer,attendees,importance,showAs,categories,webLink,onlineMeeting,createdDateTime,lastModifiedDateTime',
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Microsoft Graph API error:', errorData);
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