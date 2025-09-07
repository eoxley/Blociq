import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  return await POST(req);
}

export async function POST(req: NextRequest) {
  console.log('📅 Starting Outlook calendar fetch...');

  try {
    // ✅ 1. Supabase Auth Session
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ User not authenticated:', userError);
      return NextResponse.json({ 
        error: 'Not authenticated',
        message: 'Please log in to fetch calendar events'
      }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email;
    console.log('✅ User authenticated:', userEmail);

    // ✅ 2. Get Token From outlook_tokens
    const { data: token, error: tokenError } = await supabase
      .from("outlook_tokens")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (tokenError || !token) {
      console.error('❌ No Outlook token found for user:', userId);
      return NextResponse.json({ 
        error: 'Outlook not connected', 
        message: 'Please connect your Outlook account first',
        code: 'OUTLOOK_NOT_CONNECTED'
      }, { status: 400 });
    }

    console.log('✅ Found Outlook token for user:', token.email);

    // ✅ 3. Check if token is expired and refresh if needed
    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    let refreshedToken = false;

    if (expiresAt <= fiveMinutesFromNow) {
      console.log('🔄 Token expired or expiring soon, refreshing...');
      
      try {
        const tenantId = process.env.OUTLOOK_TENANT_ID || 'common';
        const refreshResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.OUTLOOK_CLIENT_ID!,
            client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: token.refresh_token,
            redirect_uri: process.env.OUTLOOK_REDIRECT_URI!,
          }),
        });

        if (!refreshResponse.ok) {
          const errorText = await refreshResponse.text();
          console.error('❌ Failed to refresh token:', errorText);
          
          return NextResponse.json({ 
            error: 'Token refresh failed',
            message: 'Your Outlook session has expired. Please reconnect your account.',
            code: 'TOKEN_REFRESH_FAILED'
          }, { status: 401 });
        }

        const refreshData = await refreshResponse.json();
        const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();

        // Update the stored access_token + expires_at
        const { error: updateError } = await supabase
          .from("outlook_tokens")
          .update({
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token,
            expires_at: newExpiresAt
          })
          .eq("user_id", userId);

        if (updateError) {
          console.error('❌ Failed to update token:', updateError);
          return NextResponse.json({ 
            error: 'Failed to update token',
            message: 'Please try again or reconnect your account'
          }, { status: 500 });
        }

        token.access_token = refreshData.access_token;
        refreshedToken = true;
        console.log('✅ Token refreshed successfully');
      } catch (error) {
        console.error('❌ Error refreshing token:', error);
        return NextResponse.json({ 
          error: 'Token refresh failed',
          message: 'Your Outlook session has expired. Please reconnect your account.',
          code: 'TOKEN_REFRESH_FAILED'
        }, { status: 401 });
      }
    }

    // ✅ 4. Fetch calendar events from Microsoft Graph API
    console.log('📅 Fetching calendar events from Outlook...');
    
    const eventsResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me/calendar/events?$orderby=start/dateTime&$top=20&$select=id,subject,body,location,start,end,isAllDay,organizer,attendees,importance,showAs,categories,webLink,onlineMeeting,createdDateTime,lastModifiedDateTime",
      {
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text();
      console.error('❌ Failed to fetch calendar events:', errorText);
      
      if (eventsResponse.status === 401 || eventsResponse.status === 403) {
        return NextResponse.json({ 
          error: 'Authentication failed',
          message: 'Your Outlook session has expired. Please reconnect your account.',
          code: 'AUTH_FAILED'
        }, { status: 401 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch calendar events',
        message: 'Unable to retrieve calendar events from Outlook',
        details: process.env.NODE_ENV === 'development' ? errorText : undefined
      }, { status: 500 });
    }

    const eventsData = await eventsResponse.json();
    const events = eventsData.value || [];
    
    console.log(`✅ Fetched ${events.length} calendar events from Outlook`);

    // ✅ 5. Transform events to match expected format
    const transformedEvents = events.map((event: any) => ({
      id: event.id,
      outlook_id: event.id,
      user_id: userId,
      subject: event.subject || 'No Subject',
      title: event.subject || 'No Subject',
      description: event.body?.content || null,
      location: event.location?.displayName || null,
      start_time: event.start?.dateTime,
      end_time: event.end?.dateTime,
      timeZone: event.start?.timeZone || 'UTC',
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
      event_type: 'outlook',
      source: 'outlook',
      sync_status: 'live_outlook',
      last_sync_at: new Date().toISOString()
    }));

    const responseData = {
      success: true,
      message: 'Calendar events fetched successfully from Outlook',
      data: {
        events: transformedEvents,
        totalCount: transformedEvents.length,
        tokenRefreshed: refreshedToken,
        source: 'microsoft_graph_api'
      },
      routeId: "app/api/outlook/calendar-v2/route.ts",
      build: process.env.VERCEL_GIT_COMMIT_SHA ?? null
    };
    
    const res = NextResponse.json(responseData);
    res.headers.set("x-blociq-route", "app/api/outlook/calendar-v2/route.ts");
    return res;

  } catch (error) {
    console.error('❌ Unexpected error in fetch-outlook-calendar:', error);
    const errorData = { 
      error: 'Unexpected error',
      message: 'An unexpected error occurred while fetching calendar events',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      routeId: "app/api/outlook/calendar-v2/route.ts",
      build: process.env.VERCEL_GIT_COMMIT_SHA ?? null
    };
    const res = NextResponse.json(errorData, { status: 500 });
    res.headers.set("x-blociq-route", "app/api/outlook/calendar-v2/route.ts");
    return res;
  }
}
