import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    console.log("📧 Starting email sync process...");
    
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
      return NextResponse.json({ error: "No valid Outlook token found. Please connect your Outlook account first." }, { status: 401 });
    }

    console.log("✅ Outlook token found, expires at:", tokens.expires_at);

    // Check if token is expired
    if (new Date(tokens.expires_at) < new Date()) {
      console.error("❌ Outlook token has expired");
      return NextResponse.json({ error: "Outlook token has expired. Please reconnect your account." }, { status: 401 });
    }

    // Fetch emails from Microsoft Graph API
    console.log("📡 Calling Microsoft Graph API for emails...");
    console.log("🔗 API URL: https://graph.microsoft.com/v1.0/me/messages");
    
    const graphApiUrl = "https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,ccRecipients,body,bodyPreview,internetMessageId,conversationId,receivedDateTime,isRead,flag,categories,importance,hasAttachments";
    
    console.log("📋 Request parameters:");
    console.log("  - Top: 50 emails");
    console.log("  - Order by: receivedDateTime desc");
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
        error: "Failed to fetch emails from Outlook",
        details: errorData
      }, { status: response.status });
    }

    const result = await response.json();
    const emails = result.value || [];
    
    console.log("📧 Raw emails response summary:");
    console.log("  - Total emails received:", emails.length);
    console.log("  - Response has @odata.nextLink:", !!result["@odata.nextLink"]);
    
    // Log sample emails for debugging
    if (emails.length > 0) {
      console.log("📧 Sample emails (first 3):");
      emails.slice(0, 3).forEach((email: any, index: number) => {
        console.log(`  Email ${index + 1}:`);
        console.log(`    - ID: ${email.id}`);
        console.log(`    - Subject: ${email.subject || 'No Subject'}`);
        console.log(`    - From: ${email.from?.emailAddress?.address || 'No sender'}`);
        console.log(`    - Received: ${email.receivedDateTime || 'No date'}`);
        console.log(`    - Is Read: ${email.isRead || false}`);
        console.log(`    - Has Attachments: ${email.hasAttachments || false}`);
        console.log(`    - Importance: ${email.importance || 'normal'}`);
        console.log(`    - Categories: ${email.categories?.join(', ') || 'No categories'}`);
      });
    } else {
      console.log("⚠️ No emails found in the response");
    }

    // Transform emails for database insertion
    console.log("🔄 Transforming emails for database insertion...");
    
    const inserts = emails.map((email: any) => {
      const transformedEmail = {
        outlook_message_id: email.id,
        message_id: email.internetMessageId,
        thread_id: email.conversationId,
        subject: email.subject || "(No subject)",
        from_email: email.from?.emailAddress?.address || null,
        from_name: email.from?.emailAddress?.name || null,
        to_email: email.toRecipients?.map((r: any) => r.emailAddress?.address).filter(Boolean) || [],
        cc_email: email.ccRecipients?.map((r: any) => r.emailAddress?.address).filter(Boolean) || [],
        body_full: email.body?.content || null,
        body_preview: email.bodyPreview || null,
        received_at: email.receivedDateTime,
        is_read: email.isRead || false,
        is_handled: false,
        is_deleted: false,
        folder: "inbox",
        importance: email.importance || "normal",
        has_attachments: email.hasAttachments || false,
        flag_status: email.flag?.flagStatus || "notFlagged",
        categories: email.categories || [],
        user_id: user.id,
        last_sync_at: new Date().toISOString(),
      };
      
      return transformedEmail;
    });

    console.log("✅ Transformed emails for database insertion");
    console.log(`📊 Insert summary: ${inserts.length} emails ready for upsert`);

    // Log sample transformed emails
    if (inserts.length > 0) {
      console.log("📧 Sample transformed emails (first 2):");
      inserts.slice(0, 2).forEach((email: any, index: number) => {
        console.log(`  Transformed Email ${index + 1}:`);
        console.log(`    - Outlook Message ID: ${email.outlook_message_id}`);
        console.log(`    - Subject: ${email.subject}`);
        console.log(`    - From Email: ${email.from_email}`);
        console.log(`    - From Name: ${email.from_name}`);
        console.log(`    - Received At: ${email.received_at}`);
        console.log(`    - Is Read: ${email.is_read}`);
        console.log(`    - Has Attachments: ${email.has_attachments}`);
        console.log(`    - Categories: ${email.categories.length}`);
      });
    }

    // Upsert emails to database
    console.log("💾 Upserting emails to database...");
    
    const { data: upsertData, error: insertError } = await supabase
      .from("incoming_emails")
      .upsert(inserts, { 
        onConflict: "outlook_message_id",
        ignoreDuplicates: false 
      });

    if (insertError) {
      console.error("❌ Database insert error:", insertError);
      return NextResponse.json({ 
        error: "Failed to save emails to database",
        details: insertError
      }, { status: 500 });
    }

    console.log("✅ Database upsert completed successfully");
    console.log("📊 Upsert result:", upsertData);

    // Verify the sync by checking database count
    const { count: dbCount, error: countError } = await supabase
      .from("incoming_emails")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_deleted", false);

    if (countError) {
      console.error("⚠️ Could not verify database count:", countError);
    } else {
      console.log(`📊 Total emails in database for user: ${dbCount}`);
    }

    const responseData = {
      message: "Emails synced successfully",
      count: inserts.length,
      total_in_db: dbCount || 0,
      synced_at: new Date().toISOString(),
      debug_info: {
        api_url: graphApiUrl,
        response_status: response.status,
        emails_received: emails.length,
        emails_transformed: inserts.length
      }
    };

    console.log("🎉 Email sync completed successfully");
    console.log("📊 Final sync summary:", responseData);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Email sync error:", error);
    return NextResponse.json({ 
      error: "Internal server error during email sync",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
