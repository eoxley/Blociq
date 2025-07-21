import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    console.log("🔄 Starting enhanced calendar sync process...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Get the most recent valid token for this user
    const { data: tokens, error: tokenError } = await supabase
      .from("outlook_tokens")
      .select("*")
      .eq("user_id", user.id)
      .order("expires_at", { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokens) {
      console.error("❌ No valid Outlook token found:", tokenError);
      return NextResponse.json({ error: "No valid Outlook token found" }, { status: 401 });
    }

    console.log("✅ Outlook token found, expires at:", tokens.expires_at);

    // Check if token is expired
    if (new Date(tokens.expires_at) < new Date()) {
      console.error("❌ Outlook token has expired");
      return NextResponse.json({ error: "Outlook token has expired" }, { status: 401 });
    }

    // Calculate date range for calendar view (wide range to capture all events)
    const now = new Date();
    const startDate = new Date(now.getFullYear() - 1, 0, 1); // January 1st of last year
    const endDate = new Date(now.getFullYear() + 1, 11, 31); // December 31st of next year
    
    const startDateTime = startDate.toISOString();
    const endDateTime = endDate.toISOString();

    console.log("📅 Date range for calendar sync:");
    console.log(`  - Start: ${startDateTime} (${startDate.toDateString()})`);
    console.log(`  - End: ${endDateTime} (${endDate.toDateString()})`);
    console.log(`  - Range: ~2 years to ensure all events are captured`);

    // Fetch events from Microsoft Graph API using calendarview endpoint
    console.log("📡 Calling Microsoft Graph API for calendar events...");
    console.log("🔗 Using /me/calendarview endpoint for reliable event capture");
    
    const graphApiUrl = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$top=1000&$orderby=start/dateTime&$select=id,subject,body,location,start,end,isAllDay,organizer,attendees,importance,showAs,categories,webLink,onlineMeeting,createdDateTime,lastModifiedDateTime,seriesMasterId,type,recurrence`;
    
    console.log("📋 Request parameters:");
    console.log("  - Endpoint: /me/calendarview");
    console.log("  - Top: 1000 events (increased limit)");
    console.log("  - Order by: start/dateTime");
    console.log("  - Select: All relevant fields including recurrence");
    console.log("  - Date range: Wide range to capture all events");
    
    const response = await fetch(graphApiUrl, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("📡 Graph API Response Status:", response.status);
    console.log("📡 Graph API Response Headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Microsoft Graph API error:", errorData);
      return NextResponse.json({ 
        error: "Failed to fetch calendar events from Outlook",
        details: errorData
      }, { status: response.status });
    }

    const result = await response.json();
    const events = result.value || [];
    
    console.log("📅 Calendar view response summary:");
    console.log("  - Total events received:", events.length);
    console.log("  - Response has @odata.nextLink:", !!result["@odata.nextLink"]);
    console.log("  - Date range covered:", `${startDateTime} to ${endDateTime}`);
    
    // Log sample events for debugging
    if (events.length > 0) {
      console.log("📅 Sample events (first 5):");
      events.slice(0, 5).forEach((event: any, index: number) => {
        console.log(`  Event ${index + 1}:`);
        console.log(`    - ID: ${event.id}`);
        console.log(`    - Subject: ${event.subject || 'No Subject'}`);
        console.log(`    - Start: ${event.start?.dateTime || 'No start time'}`);
        console.log(`    - End: ${event.end?.dateTime || 'No end time'}`);
        console.log(`    - Is All Day: ${event.isAllDay || false}`);
        console.log(`    - Created: ${event.createdDateTime || 'No creation time'}`);
        console.log(`    - Modified: ${event.lastModifiedDateTime || 'No modification time'}`);
        console.log(`    - Organizer: ${event.organizer?.emailAddress?.address || 'No organizer'}`);
        console.log(`    - Attendees: ${event.attendees?.length || 0} attendees`);
        console.log(`    - Categories: ${event.categories?.join(', ') || 'No categories'}`);
        console.log(`    - Web Link: ${event.webLink ? 'Present' : 'None'}`);
        console.log(`    - Online Meeting: ${event.onlineMeeting ? 'Present' : 'None'}`);
        console.log(`    - Type: ${event.type || 'singleInstance'}`);
        console.log(`    - Series Master ID: ${event.seriesMasterId || 'None'}`);
        console.log(`    - Has Recurrence: ${!!event.recurrence}`);
      });
    } else {
      console.log("⚠️ No events found in the calendar view response");
    }

    // Enhanced event categorization
    const manualEvents = events.filter((event: any) => !event.onlineMeeting);
    const onlineEvents = events.filter((event: any) => event.onlineMeeting);
    const recurringEvents = events.filter((event: any) => event.recurrence);
    const singleEvents = events.filter((event: any) => !event.recurrence);
    
    console.log("📊 Enhanced event breakdown:");
    console.log(`  - Manual events: ${manualEvents.length}`);
    console.log(`  - Online meeting events: ${onlineEvents.length}`);
    console.log(`  - Recurring events: ${recurringEvents.length}`);
    console.log(`  - Single instance events: ${singleEvents.length}`);
    console.log(`  - Total events: ${events.length}`);

    // Transform events for database insertion with enhanced data
    console.log("🔄 Transforming events for database insertion...");
    
    const inserts = events.map((event: any) => {
      const transformedEvent = {
        outlook_id: event.id,
        subject: event.subject || "No Subject",
        description: event.body?.content || null,
        location: event.location?.displayName || null,
        start_time: event.start?.dateTime,
        end_time: event.end?.dateTime,
        is_all_day: event.isAllDay || false,
        organiser: event.organizer?.emailAddress?.address || null,
        organiser_name: event.organizer?.emailAddress?.name || null,
        attendees: event.attendees || [],
        importance: event.importance || "normal",
        show_as: event.showAs || "busy",
        categories: event.categories || [],
        web_link: event.webLink || null,
        online_meeting: event.onlineMeeting || null,
        created_at_outlook: event.createdDateTime || null,
        modified_at_outlook: event.lastModifiedDateTime || null,
        event_type: event.type || "singleInstance",
        series_master_id: event.seriesMasterId || null,
        recurrence: event.recurrence || null,
        user_id: user.id,
        last_sync_at: new Date().toISOString(),
      };
      
      return transformedEvent;
    });

    console.log("✅ Transformed events for database insertion");
    console.log(`📊 Insert summary: ${inserts.length} events ready for upsert`);

    // Log sample transformed events
    if (inserts.length > 0) {
      console.log("📅 Sample transformed events (first 3):");
      inserts.slice(0, 3).forEach((event: any, index: number) => {
        console.log(`  Transformed Event ${index + 1}:`);
        console.log(`    - Outlook ID: ${event.outlook_id}`);
        console.log(`    - Subject: ${event.subject}`);
        console.log(`    - Start Time: ${event.start_time}`);
        console.log(`    - End Time: ${event.end_time}`);
        console.log(`    - Is All Day: ${event.is_all_day}`);
        console.log(`    - Organizer: ${event.organiser}`);
        console.log(`    - Attendees Count: ${event.attendees.length}`);
        console.log(`    - Has Online Meeting: ${!!event.online_meeting}`);
        console.log(`    - Event Type: ${event.event_type}`);
        console.log(`    - Series Master ID: ${event.series_master_id || 'None'}`);
        console.log(`    - Has Recurrence: ${!!event.recurrence}`);
        console.log(`    - Created at Outlook: ${event.created_at_outlook}`);
        console.log(`    - Modified at Outlook: ${event.modified_at_outlook}`);
      });
    }

    // Upsert events to database with enhanced conflict resolution
    console.log("💾 Upserting events to database...");
    console.log("🔄 Using outlook_id for conflict resolution to ensure no duplicates");
    
    const { data: upsertData, error: insertError } = await supabase
      .from("calendar_events")
      .upsert(inserts, { 
        onConflict: "outlook_id",
        ignoreDuplicates: false 
      });

    if (insertError) {
      console.error("❌ Database insert error:", insertError);
      return NextResponse.json({ 
        error: "Failed to save calendar events to database",
        details: insertError
      }, { status: 500 });
    }

    console.log("✅ Database upsert completed successfully");
    console.log("📊 Upsert result summary:", {
      inserted: inserts.length, // upsertData is typically null/undefined, so use inserts.length
      total_processed: inserts.length
    });

    // Verify the sync by checking database count and recent events
    const { count: dbCount, error: countError } = await supabase
      .from("calendar_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      console.error("⚠️ Could not verify database count:", countError);
    } else {
      console.log(`📊 Total events in database for user: ${dbCount}`);
    }

    // Get recent events for verification
    const { data: recentEvents, error: recentError } = await supabase
      .from("calendar_events")
      .select("outlook_id, subject, start_time, created_at_outlook")
      .eq("user_id", user.id)
      .order("start_time", { ascending: false })
      .limit(5);

    if (!recentError && recentEvents) {
      console.log("📅 Recent events in database (verification):");
      recentEvents.forEach((event: any, index: number) => {
        console.log(`  ${index + 1}. ${event.subject} (${event.start_time})`);
      });
    }

    const responseData = {
      message: "Calendar synced successfully using enhanced calendarview endpoint",
      count: inserts.length,
      manual_events: manualEvents.length,
      online_events: onlineEvents.length,
      recurring_events: recurringEvents.length,
      single_events: singleEvents.length,
      total_in_db: dbCount || 0,
      synced_at: new Date().toISOString(),
      date_range: {
        start: startDateTime,
        end: endDateTime,
        duration_days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      },
      debug_info: {
        api_url: graphApiUrl,
        response_status: response.status,
        events_received: events.length,
        events_transformed: inserts.length,
        endpoint: "calendarview",
        has_next_link: !!result["@odata.nextLink"]
      }
    };

    console.log("🎉 Enhanced calendar sync completed successfully");
    console.log("📊 Final sync summary:", {
      total_events: responseData.count,
      manual_events: responseData.manual_events,
      online_events: responseData.online_events,
      recurring_events: responseData.recurring_events,
      date_range_days: responseData.date_range.duration_days,
      total_in_database: responseData.total_in_db
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Enhanced calendar sync error:", error);
    return NextResponse.json({ 
      error: "Internal server error during enhanced calendar sync",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 