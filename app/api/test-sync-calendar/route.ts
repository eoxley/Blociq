import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    console.log("🧪 Test calendar sync endpoint called...");
    
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

    // Test the Graph API connection first
    console.log("📡 Testing Microsoft Graph API connection...");
    
    const testResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!testResponse.ok) {
      const errorData = await testResponse.json();
      console.error("❌ Graph API connection test failed:", errorData);
      return NextResponse.json({ 
        error: "Failed to connect to Microsoft Graph API",
        details: errorData
      }, { status: testResponse.status });
    }

    const userInfo = await testResponse.json();
    console.log("✅ Graph API connection successful");
    console.log("👤 User info:", {
      id: userInfo.id,
      displayName: userInfo.displayName,
      mail: userInfo.mail,
      userPrincipalName: userInfo.userPrincipalName
    });

    // Now test calendar events fetch
    console.log("📅 Testing calendar events fetch...");
    
    const graphApiUrl = "https://graph.microsoft.com/v1.0/me/events?$top=10&$orderby=start/dateTime&$select=id,subject,body,location,start,end,isAllDay,organizer,attendees,importance,showAs,categories,webLink,onlineMeeting,createdDateTime,lastModifiedDateTime";
    
    const response = await fetch(graphApiUrl, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("📡 Calendar API Response Status:", response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Calendar API error:", errorData);
      return NextResponse.json({ 
        error: "Failed to fetch calendar events from Outlook",
        details: errorData
      }, { status: response.status });
    }

    const result = await response.json();
    const events = result.value || [];
    
    console.log("📅 Test results:");
    console.log("  - Total events received:", events.length);
    console.log("  - Response has @odata.nextLink:", !!result["@odata.nextLink"]);
    
    // Analyze events
    const manualEvents = events.filter((event: any) => !event.onlineMeeting);
    const onlineEvents = events.filter((event: any) => event.onlineMeeting);
    
    console.log("📊 Event breakdown:");
    console.log(`  - Manual events: ${manualEvents.length}`);
    console.log(`  - Online meeting events: ${onlineEvents.length}`);
    console.log(`  - Total events: ${events.length}`);

    // Log detailed event information
    if (events.length > 0) {
      console.log("📅 Detailed event analysis:");
      events.forEach((event: any, index: number) => {
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
        console.log(`    - Type: ${event.onlineMeeting ? 'Online Meeting' : 'Manual Event'}`);
      });
    } else {
      console.log("⚠️ No events found in the test response");
    }

    // Check existing events in database
    const { data: existingEvents, error: dbError } = await supabase
      .from("calendar_events")
      .select("outlook_id, subject, start_time, created_at_outlook, modified_at_outlook")
      .eq("user_id", user.id)
      .order("start_time", { ascending: false })
      .limit(10);

    if (dbError) {
      console.error("⚠️ Could not fetch existing events:", dbError);
    } else {
      console.log("💾 Existing events in database:", existingEvents?.length || 0);
      if (existingEvents && existingEvents.length > 0) {
        console.log("📅 Sample existing events:");
        existingEvents.slice(0, 3).forEach((event: any, index: number) => {
          console.log(`  DB Event ${index + 1}:`);
          console.log(`    - Outlook ID: ${event.outlook_id}`);
          console.log(`    - Subject: ${event.subject}`);
          console.log(`    - Start Time: ${event.start_time}`);
          console.log(`    - Created at Outlook: ${event.created_at_outlook}`);
          console.log(`    - Modified at Outlook: ${event.modified_at_outlook}`);
        });
      }
    }

    const testResults = {
      message: "Calendar sync test completed successfully",
      user_info: {
        id: userInfo.id,
        displayName: userInfo.displayName,
        mail: userInfo.mail
      },
      api_test: {
        status: "success",
        response_status: response.status,
        events_received: events.length,
        manual_events: manualEvents.length,
        online_events: onlineEvents.length
      },
      database_test: {
        existing_events: existingEvents?.length || 0,
        error: dbError ? dbError.message : null
      },
      debug_info: {
        api_url: graphApiUrl,
        token_expires_at: tokens.expires_at,
        test_timestamp: new Date().toISOString()
      }
    };

    console.log("🎉 Calendar sync test completed successfully");
    console.log("📊 Test results summary:", testResults);

    return NextResponse.json(testResults);

  } catch (error) {
    console.error("❌ Calendar sync test error:", error);
    return NextResponse.json({ 
      error: "Internal server error during calendar sync test",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 