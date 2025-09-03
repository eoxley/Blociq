import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  return await syncCalendar(req);
}

export async function POST(req: NextRequest) {
  return await syncCalendar(req);
}

async function syncCalendar(req: NextRequest) {
  try {
    console.log("📅 Starting calendar sync process...");

    // 1. Get the latest valid Outlook token
    const { data: tokens, error } = await supabase
      .from("outlook_tokens")
      .select("*")
      .order("expires_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !tokens) {
      console.error("❌ No valid Outlook token found");
      return NextResponse.json({ error: "No valid token found" }, { status: 401 });
    }

    console.log("✅ Found Outlook token for user:", tokens.user_id);

    // Check if token is expired and refresh if needed
    const now = new Date();
    const expiresAt = new Date(tokens.expires_at);
    
    if (expiresAt <= now) {
      console.log("🔄 Token expired, refreshing...");
      
      // Refresh token
      const tenantId = process.env.AZURE_TENANT_ID || 'common';
      const tokenUrl = process.env.MICROSOFT_TOKEN_URL || `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
      const refreshResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token,
          redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
        }),
      });

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error("❌ Failed to refresh token:", errorText);
        return NextResponse.json({ error: "Failed to refresh token" }, { status: 500 });
      }

      const refreshData = await refreshResponse.json();
      const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();

      // Update the stored token
      const { error: updateError } = await supabase
        .from("outlook_tokens")
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: newExpiresAt
        })
        .eq("user_id", tokens.user_id);

      if (updateError) {
        console.error("❌ Failed to update token:", updateError);
        return NextResponse.json({ error: "Failed to update token" }, { status: 500 });
      }

      tokens.access_token = refreshData.access_token;
      console.log("✅ Token refreshed successfully");
    }

    // 2. Fetch calendar events from Microsoft Graph
    console.log("📅 Fetching calendar events from Microsoft Graph...");
    const graphBaseUrl = process.env.GRAPH_BASE_URL || 'https://graph.microsoft.com/v1.0';
    const response = await fetch(`${graphBaseUrl}/me/events?$top=100&$orderby=start/dateTime desc`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("❌ Graph API error:", err);
      return NextResponse.json({ error: "Graph API call failed", details: err }, { status: 500 });
    }

    const result = await response.json();
    const events = result.value || [];
    console.log(`✅ Fetched ${events.length} calendar events from Outlook`);

    if (events.length === 0) {
      return NextResponse.json({ message: "No calendar events found", count: 0 });
    }

    // 3. Format and insert into Supabase
    console.log("💾 Processing and saving calendar events to Supabase...");
    const inserts = events.map((event: any) => ({
      outlook_id: event.id,
      subject: event.subject || "(No Subject)",
      description: event.bodyPreview || event.body?.content || "",
      location: event.location?.displayName || null,
      start_time: event.start?.dateTime,
      end_time: event.end?.dateTime,
      is_all_day: event.isAllDay || false,
      organiser: event.organizer?.emailAddress?.address || null,
      organiser_name: event.organizer?.emailAddress?.name || null,
      attendees: event.attendees?.map((attendee: any) => ({
        email: attendee.emailAddress?.address,
        name: attendee.emailAddress?.name,
        response: attendee.status?.response || 'none'
      })) || [],
      recurrence: event.recurrence || null,
      importance: event.importance || 'normal',
      sensitivity: event.sensitivity || 'normal',
      show_as: event.showAs || 'busy',
      categories: event.categories || [],
      user_id: tokens.user_id,
      last_sync_at: new Date().toISOString(),
      created_at: event.createdDateTime,
      updated_at: event.lastModifiedDateTime,
      web_link: event.webLink || null,
      online_meeting: event.onlineMeeting ? {
        join_url: event.onlineMeeting.joinUrl,
        provider: event.onlineMeeting.provider
      } : null
    }));

    console.log(`📝 Inserting ${inserts.length} calendar events...`);

    const { error: insertError, data: insertedData } = await supabase
      .from("calendar_events")
      .upsert(inserts, {
        onConflict: "outlook_id",
        ignoreDuplicates: true
      });

    if (insertError) {
      console.error("❌ Supabase insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log("✅ Calendar events successfully synced to Supabase");

    // 4. Return success response
    return NextResponse.json({ 
      success: true,
      message: "Calendar synced successfully", 
      count: inserts.length,
      user_id: tokens.user_id,
      synced_at: new Date().toISOString()
    });

  } catch (err) {
    console.error("🔥 Unexpected error in sync-calendar:", err);
    return NextResponse.json({ 
      error: "Unexpected server error",
      details: process.env.NODE_ENV === 'development' ? err instanceof Error ? err.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
} 