import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    console.log("🔄 Starting calendar sync process...");
    
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

    // Fetch events from Microsoft Graph API with improved parameters
    console.log("📡 Calling Microsoft Graph API for calendar events...");
    console.log("🔗 API URL: https://graph.microsoft.com/v1.0/me/events");
    
    const graphApiUrl = "https://graph.microsoft.com/v1.0/me/events?$top=100&$orderby=start/dateTime&$select=id,subject,body,location,start,end,isAllDay,organizer,attendees,importance,showAs,categories,webLink,onlineMeeting,createdDateTime,lastModifiedDateTime";
    
    console.log("📋 Request parameters:");
    console.log("  - Top: 100 events");
    console.log("  - Order by: start/dateTime");
    console.log("  - Select: All relevant fields");
    
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
    
    console.log("📅 Raw events response summary:");
    console.log("  - Total events received:", events.length);
    console.log("  - Response has @odata.nextLink:", !!result["@odata.nextLink"]);
    
    // Log sample events for debugging
    if (events.length > 0) {
      console.log("📅 Sample events (first 3):");
      events.slice(0, 3).forEach((event: any, index: number) => {
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
      });
    } else {
      console.log("⚠️ No events found in the response");
    }

    // Check for manually created events (events without online meeting data)
    const manualEvents = events.filter((event: any) => !event.onlineMeeting);
    const onlineEvents = events.filter((event: any) => event.onlineMeeting);
    
    console.log("📊 Event breakdown:");
    console.log(`  - Manual events: ${manualEvents.length}`);
    console.log(`  - Online meeting events: ${onlineEvents.length}`);
    console.log(`  - Total events: ${events.length}`);

    // Transform events for database insertion
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
        user_id: user.id,
        last_sync_at: new Date().toISOString(),
      };
      
      return transformedEvent;
    });

    console.log("✅ Transformed events for database insertion");
    console.log(`📊 Insert summary: ${inserts.length} events ready for upsert`);

    // Log sample transformed events
    if (inserts.length > 0) {
      console.log("📅 Sample transformed events (first 2):");
      inserts.slice(0, 2).forEach((event: any, index: number) => {
        console.log(`  Transformed Event ${index + 1}:`);
        console.log(`    - Outlook ID: ${event.outlook_id}`);
        console.log(`    - Subject: ${event.subject}`);
        console.log(`    - Start Time: ${event.start_time}`);
        console.log(`    - End Time: ${event.end_time}`);
        console.log(`    - Is All Day: ${event.is_all_day}`);
        console.log(`    - Organizer: ${event.organiser}`);
        console.log(`    - Attendees Count: ${event.attendees.length}`);
        console.log(`    - Has Online Meeting: ${!!event.online_meeting}`);
        console.log(`    - Created at Outlook: ${event.created_at_outlook}`);
        console.log(`    - Modified at Outlook: ${event.modified_at_outlook}`);
      });
    }

    // Upsert events to database
    console.log("💾 Upserting events to database...");
    
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
    console.log("📊 Upsert result:", upsertData);

    // Verify the sync by checking database count
    const { count: dbCount, error: countError } = await supabase
      .from("calendar_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      console.error("⚠️ Could not verify database count:", countError);
    } else {
      console.log(`📊 Total events in database for user: ${dbCount}`);
    }

    const responseData = {
      message: "Calendar synced successfully",
      count: inserts.length,
      manual_events: manualEvents.length,
      online_events: onlineEvents.length,
      total_in_db: dbCount || 0,
      synced_at: new Date().toISOString(),
      debug_info: {
        api_url: graphApiUrl,
        response_status: response.status,
        events_received: events.length,
        events_transformed: inserts.length
      }
    };

    console.log("🎉 Calendar sync completed successfully");
    console.log("📊 Final sync summary:", responseData);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Calendar sync error:", error);
    return NextResponse.json({ 
      error: "Internal server error during calendar sync",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 