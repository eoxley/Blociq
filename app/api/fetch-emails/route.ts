import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    console.log("🔄 Starting email fetch process...");

    // 1. Fetch latest token from Supabase
    const { data: tokens, error } = await supabase
      .from("outlook_tokens")
      .select("*")
      .order("expires_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !tokens) {
      console.error("❌ No Outlook token found:", error);
      return NextResponse.json({ error: "No valid token" }, { status: 401 });
    }

    console.log("✅ Found Outlook token for user:", tokens.user_id);

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokens.expires_at);
    
    if (expiresAt <= now) {
      console.log("🔄 Token expired, refreshing...");
      
      // Refresh token
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
          refresh_token: tokens.refresh_token,
          redirect_uri: process.env.OUTLOOK_REDIRECT_URI!,
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

    // 2. Use Microsoft Graph to pull emails
    console.log("📧 Fetching emails from Microsoft Graph...");
    const response = await fetch("https://graph.microsoft.com/v1.0/me/mailfolders/inbox/messages?$top=50&$orderby=receivedDateTime desc", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Failed to fetch emails from Microsoft Graph:", errorText);
      return NextResponse.json({ error: "Failed to fetch emails from Outlook" }, { status: 500 });
    }

    const result = await response.json();
    const emails = result.value || [];
    console.log(`✅ Fetched ${emails.length} emails from Outlook`);

    if (emails.length === 0) {
      return NextResponse.json({ message: "No emails found", count: 0 });
    }

    // 3. Save emails into Supabase
    console.log("💾 Processing and saving emails to Supabase...");
    const inserts = emails.map((msg: any) => ({
      subject: msg.subject || "(No Subject)",
      from_email: msg.from?.emailAddress?.address || "",
      from_name: msg.from?.emailAddress?.name || "",
      received_at: msg.receivedDateTime,
      body_preview: msg.bodyPreview || "",
      body_full: msg.body?.content || "",
      outlook_id: msg.id,
      outlook_message_id: msg.internetMessageId,
      to_email: msg.toRecipients?.map((r: any) => r.emailAddress.address) || [],
      cc_email: msg.ccRecipients?.map((r: any) => r.emailAddress.address) || [],
      user_id: tokens.user_id,
      is_read: msg.isRead || false,
      is_handled: false,
      folder: "inbox",
      sync_status: "synced",
      last_sync_at: new Date().toISOString(),
      tags: [], // Will be populated by AI analysis later
    }));

    console.log(`📝 Inserting ${inserts.length} emails...`);

    const { error: insertError, data: insertedData } = await supabase
      .from("incoming_emails")
      .upsert(inserts, {
        onConflict: "outlook_message_id",
        ignoreDuplicates: true
      });

    if (insertError) {
      console.error("❌ Error inserting emails:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log("✅ Emails successfully synced to Supabase");

    // 4. Return success response
    return NextResponse.json({ 
      message: "Emails synced successfully", 
      count: inserts.length,
      user_id: tokens.user_id,
      synced_at: new Date().toISOString()
    });

  } catch (err) {
    console.error("❌ Unexpected error in fetch-emails:", err);
    return NextResponse.json({ 
      error: "Unexpected error occurred",
      details: process.env.NODE_ENV === 'development' ? err instanceof Error ? err.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
}
