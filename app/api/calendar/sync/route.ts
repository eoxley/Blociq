/**
 * Unified Calendar Sync API
 * Syncs Outlook calendar events with Property Events system
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  return await syncCalendarEvents(req);
}

export async function POST(req: NextRequest) {
  return await syncCalendarEvents(req);
}

async function syncCalendarEvents(req: NextRequest) {
  try {
    console.log('🔄 Starting unified calendar sync process...');
    
    const supabase = createClient(cookies());
    
    // Get the current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (sessionError || !user) {
      console.error('❌ User authentication failed:', sessionError);
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to sync calendar events'
      }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.email);

    // Get the most recent valid token for this user
    const { data: tokens, error: tokenError } = await supabase
      .from("outlook_tokens")
      .select("*")
      .eq("user_id", user.id)
      .order("expires_at", { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokens) {
      console.error('❌ No valid Outlook token found:', tokenError);
      return NextResponse.json({ 
        error: 'No Outlook connection',
        message: 'Please connect your Outlook account to sync calendar events'
      }, { status: 401 });
    }

    console.log('✅ Outlook token found, expires at:', tokens.expires_at);

    // Check if token is expired and refresh if needed
    let accessToken = tokens.access_token;
    if (new Date(tokens.expires_at) < new Date()) {
      console.log('🔄 Token expired, refreshing...');
      
      try {
        const refreshData = await refreshOutlookToken(supabase, user.id, tokens.refresh_token);
        accessToken = refreshData.access_token;
        console.log('✅ Token refreshed successfully');
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        return NextResponse.json({ 
          error: 'Token refresh failed',
          message: 'Your Outlook session has expired. Please reconnect your account.'
        }, { status: 401 });
      }
    }

    // Calculate date range for calendar view (next 90 days)
    const now = new Date();
    const startDate = new Date(now);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 90); // Next 90 days
    
    const startDateTime = startDate.toISOString();
    const endDateTime = endDate.toISOString();

    console.log('📅 Date range for calendar sync:');
    console.log(`  - Start: ${startDateTime}`);
    console.log(`  - End: ${endDateTime}`);

    // Fetch events from Microsoft Graph API using calendarview endpoint
    console.log('📡 Calling Microsoft Graph API for calendar events...');
    
    const graphApiUrl = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$top=100&$orderby=start/dateTime&$select=id,subject,body,location,start,end,isAllDay,organizer,attendees,importance,showAs,categories,webLink,onlineMeeting,createdDateTime,lastModifiedDateTime,seriesMasterId,type,recurrence`;
    
    const response = await fetch(graphApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log('📡 Graph API Response Status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Microsoft Graph API error:', errorData);
      return NextResponse.json({ 
        error: "Failed to fetch calendar events from Outlook",
        details: errorData
      }, { status: response.status });
    }

    const result = await response.json();
    const events = result.value || [];
    
    console.log('📅 Calendar view response summary:');
    console.log('  - Total events received:', events.length);

    if (events.length === 0) {
      return NextResponse.json({ 
        message: "No calendar events found in the next 90 days",
        count: 0,
        synced: 0
      });
    }

    // Process and sync events to property_events table
    console.log('💾 Processing and syncing calendar events...');
    
    let syncedCount = 0;
    let skippedCount = 0;

    for (const event of events) {
      try {
        // Check if event already exists
        const { data: existingEvent } = await supabase
          .from('property_events')
          .select('id')
          .eq('outlook_event_id', event.id)
          .single();

        if (existingEvent) {
          console.log(`⏭️  Skipping existing event: ${event.subject}`);
          skippedCount++;
          continue;
        }

        // Transform event data for property_events table
        const eventData = {
          title: event.subject || 'Untitled Event',
          description: event.body?.content || '',
          start_time: event.start?.dateTime || event.start?.date,
          end_time: event.end?.dateTime || event.end?.date,
          event_type: 'CALENDAR_EVENT',
          category: 'Meeting',
          outlook_event_id: event.id,
          location: event.location?.displayName || '',
          created_by: user.id,
          // Try to extract building info from event title or description
          building_id: extractBuildingId(event.subject, event.body?.content)
        };

        // Insert into property_events table
        const { error: insertError } = await supabase
          .from('property_events')
          .insert(eventData);

        if (insertError) {
          console.error(`❌ Failed to insert event ${event.subject}:`, insertError);
          skippedCount++;
        } else {
          console.log(`✅ Synced event: ${event.subject}`);
          syncedCount++;
        }

      } catch (eventError) {
        console.error(`❌ Error processing event ${event.subject}:`, eventError);
        skippedCount++;
      }
    }

    console.log('✅ Calendar sync completed:');
    console.log(`  - Total events processed: ${events.length}`);
    console.log(`  - Successfully synced: ${syncedCount}`);
    console.log(`  - Skipped (duplicates/errors): ${skippedCount}`);

    return NextResponse.json({
      success: true,
      message: `Calendar sync completed successfully`,
      total: events.length,
      synced: syncedCount,
      skipped: skippedCount
    });

  } catch (error) {
    console.error('❌ Calendar sync error:', error);
    return NextResponse.json({
      success: false,
      error: 'Calendar sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function refreshOutlookToken(supabase: any, userId: string, refreshToken: string) {
  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
      redirect_uri: process.env.OUTLOOK_REDIRECT_URI!
    });

    const tenantId = process.env.OUTLOOK_TENANT_ID || 'common';
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const response = await fetch(tokenUrl, {
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

    const refreshData = await response.json();
    const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();

    // Update the stored token
    const { error: updateError } = await supabase
      .from("outlook_tokens")
      .update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token,
        expires_at: newExpiresAt
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("❌ Failed to update token:", updateError);
      throw new Error("Failed to update token");
    }

    return refreshData;
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    throw error;
  }
}

function extractBuildingId(title: string, description: string): string | null {
  // Simple building extraction logic - can be enhanced
  const text = `${title} ${description}`.toLowerCase();
  
  // Look for common building keywords
  const buildingKeywords = ['building', 'property', 'apartment', 'flat', 'house'];
  const hasBuildingKeyword = buildingKeywords.some(keyword => text.includes(keyword));
  
  if (hasBuildingKeyword) {
    // For now, return null - this could be enhanced to match against actual buildings
    return null;
  }
  
  return null;
}
