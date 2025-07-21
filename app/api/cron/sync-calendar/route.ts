import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the most recent valid token for this user
    const { data: tokens, error: tokenError } = await supabase
      .from("outlook_tokens")
      .select("*")
      .eq("user_id", user.id)
      .order("expires_at", { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokens) {
      return NextResponse.json({ error: "No valid Outlook token found" }, { status: 401 });
    }

    // Check if token is expired
    if (new Date(tokens.expires_at) < new Date()) {
      return NextResponse.json({ error: "Outlook token has expired" }, { status: 401 });
    }

    // Fetch events from Microsoft Graph API
    const response = await fetch("https://graph.microsoft.com/v1.0/me/events?$top=50&$orderby=start/dateTime", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Microsoft Graph API error:", errorData);
      return NextResponse.json({ 
        error: "Failed to fetch calendar events from Outlook" 
      }, { status: response.status });
    }

    const result = await response.json();
    const events = result.value || [];

    // Transform events for database insertion
    const inserts = events.map((event: any) => ({
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
      user_id: user.id,
      last_sync_at: new Date().toISOString(),
    }));

    // Upsert events to database
    const { error: insertError } = await supabase
      .from("calendar_events")
      .upsert(inserts, { 
        onConflict: "outlook_id",
        ignoreDuplicates: false 
      });

    if (insertError) {
      console.error("Database insert error:", insertError);
      return NextResponse.json({ 
        error: "Failed to save calendar events to database" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Calendar synced successfully", 
      count: inserts.length,
      synced_at: new Date().toISOString()
    });

  } catch (error) {
    console.error("Calendar sync error:", error);
    return NextResponse.json({ 
      error: "Internal server error during calendar sync" 
    }, { status: 500 });
  }
} 