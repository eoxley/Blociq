import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    console.log("🧪 Testing enhanced calendar sync endpoint...");
    
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

    if (new Date(tokens.expires_at) < new Date()) {
      console.error("❌ Outlook token has expired");
      return NextResponse.json({ error: "Outlook token has expired" }, { status: 401 });
    }

    // Test 1: Check user info
    console.log("📡 Test 1: Checking user info...");
    const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { 
        Authorization: `Bearer ${tokens.access_token}`, 
        "Content-Type": "application/json" 
      },
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      console.error("❌ User info test failed:", errorData);
      return NextResponse.json({ error: "Failed to get user info", details: errorData }, { status: userResponse.status });
    }

    const userInfo = await userResponse.json();
    console.log("✅ User info test passed:", { id: userInfo.id, displayName: userInfo.displayName, mail: userInfo.mail });

    // Test 2: Check available calendars
    console.log("📡 Test 2: Checking available calendars...");
    const calendarsResponse = await fetch("https://graph.microsoft.com/v1.0/me/calendars", {
      headers: { 
        Authorization: `Bearer ${tokens.access_token}`, 
        "Content-Type": "application/json" 
      },
    });

    if (!calendarsResponse.ok) {
      const errorData = await calendarsResponse.json();
      console.error("❌ Calendars test failed:", errorData);
      return NextResponse.json({ error: "Failed to get calendars", details: errorData }, { status: calendarsResponse.status });
    }

    const calendarsResult = await calendarsResponse.json();
    const calendars = calendarsResult.value || [];
    console.log("✅ Calendars test passed:", { count: calendars.length });

    // Test 3: Test calendarview endpoint with wide date range
    console.log("📡 Test 3: Testing calendarview endpoint...");
    
    const now = new Date();
    const startDate = new Date(now.getFullYear() - 1, 0, 1);
    const endDate = new Date(now.getFullYear() + 1, 11, 31);
    
    const startDateTime = startDate.toISOString();
    const endDateTime = endDate.toISOString();

    const calendarViewUrl = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$top=50&$orderby=start/dateTime&$select=id,subject,body,location,start,end,isAllDay,organizer,attendees,importance,showAs,categories,webLink,onlineMeeting,createdDateTime,lastModifiedDateTime,seriesMasterId,type,recurrence`;

    const calendarViewResponse = await fetch(calendarViewUrl, {
      headers: { 
        Authorization: `Bearer ${tokens.access_token}`, 
        "Content-Type": "application/json" 
      },
    });

    if (!calendarViewResponse.ok) {
      const errorData = await calendarViewResponse.json();
      console.error("❌ Calendar view test failed:", errorData);
      return NextResponse.json({ error: "Failed to get calendar view", details: errorData }, { status: calendarViewResponse.status });
    }

    const calendarViewResult = await calendarViewResponse.json();
    const events = calendarViewResult.value || [];
    
    console.log("✅ Calendar view test passed:", { 
      events_count: events.length,
      has_next_link: !!calendarViewResult["@odata.nextLink"],
      date_range: `${startDateTime} to ${endDateTime}`
    });

    // Test 4: Analyze event types
    const manualEvents = events.filter((event: any) => !event.onlineMeeting);
    const onlineEvents = events.filter((event: any) => event.onlineMeeting);
    const recurringEvents = events.filter((event: any) => event.recurrence);
    const singleEvents = events.filter((event: any) => !event.recurrence);

    console.log("📊 Event analysis:");
    console.log(`  - Manual events: ${manualEvents.length}`);
    console.log(`  - Online meeting events: ${onlineEvents.length}`);
    console.log(`  - Recurring events: ${recurringEvents.length}`);
    console.log(`  - Single instance events: ${singleEvents.length}`);
    console.log(`  - Total events: ${events.length}`);

    // Test 5: Check database schema
    console.log("💾 Test 5: Checking database schema...");
    
    const { data: schemaInfo, error: schemaError } = await supabase
      .from("calendar_events")
      .select("outlook_id, subject, start_time, event_type, series_master_id, recurrence")
      .eq("user_id", user.id)
      .limit(5);

    if (schemaError) {
      console.error("⚠️ Schema check failed:", schemaError);
    } else {
      console.log("✅ Schema check passed:", { 
        existing_events: schemaInfo?.length || 0,
        has_event_type: schemaInfo?.[0]?.event_type !== undefined,
        has_series_master_id: schemaInfo?.[0]?.series_master_id !== undefined,
        has_recurrence: schemaInfo?.[0]?.recurrence !== undefined
      });
    }

    // Test 6: Sample event details
    if (events.length > 0) {
      console.log("📅 Sample event details:");
      events.slice(0, 3).forEach((event: any, index: number) => {
        console.log(`  Event ${index + 1}:`);
        console.log(`    - Subject: ${event.subject || 'No Subject'}`);
        console.log(`    - Start: ${event.start?.dateTime || 'No start time'}`);
        console.log(`    - Type: ${event.type || 'singleInstance'}`);
        console.log(`    - Has Online Meeting: ${!!event.onlineMeeting}`);
        console.log(`    - Has Recurrence: ${!!event.recurrence}`);
        console.log(`    - Series Master ID: ${event.seriesMasterId || 'None'}`);
        console.log(`    - Created: ${event.createdDateTime || 'No creation time'}`);
        console.log(`    - Modified: ${event.lastModifiedDateTime || 'No modification time'}`);
      });
    }

    const testResults = {
      message: "Enhanced calendar sync test completed successfully",
      user_info: { 
        id: userInfo.id, 
        displayName: userInfo.displayName, 
        mail: userInfo.mail 
      },
      calendars: { 
        count: calendars.length,
        names: calendars.map((cal: any) => cal.name)
      },
      calendar_view: {
        events_count: events.length,
        has_next_link: !!calendarViewResult["@odata.nextLink"],
        date_range: {
          start: startDateTime,
          end: endDateTime,
          duration_days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        }
      },
      event_analysis: {
        manual_events: manualEvents.length,
        online_events: onlineEvents.length,
        recurring_events: recurringEvents.length,
        single_events: singleEvents.length,
        total_events: events.length
      },
      database_schema: {
        existing_events: schemaInfo?.length || 0,
        has_enhanced_fields: schemaInfo?.[0]?.event_type !== undefined
      },
      debug_info: {
        test_timestamp: new Date().toISOString(),
        token_expires_at: tokens.expires_at,
        api_endpoints_tested: ["/me", "/me/calendars", "/me/calendarview"]
      }
    };

    console.log("🎉 Enhanced calendar sync test completed successfully");
    return NextResponse.json(testResults);

  } catch (error) {
    console.error("❌ Enhanced calendar sync test error:", error);
    return NextResponse.json({ 
      error: "Internal server error during enhanced calendar sync test",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 