import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    console.log("🧪 Test email sync endpoint called...");
    
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

    // Now test email fetch
    console.log("📧 Testing email fetch...");
    
    const graphApiUrl = "https://graph.microsoft.com/v1.0/me/messages?$top=10&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,ccRecipients,body,bodyPreview,internetMessageId,conversationId,receivedDateTime,isRead,flag,categories,importance,hasAttachments";
    
    const response = await fetch(graphApiUrl, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("📡 Email API Response Status:", response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Email API error:", errorData);
      return NextResponse.json({ 
        error: "Failed to fetch emails from Outlook",
        details: errorData
      }, { status: response.status });
    }

    const result = await response.json();
    const emails = result.value || [];
    
    console.log("📧 Test results:");
    console.log("  - Total emails received:", emails.length);
    console.log("  - Response has @odata.nextLink:", !!result["@odata.nextLink"]);
    
    // Analyze emails
    const unreadEmails = emails.filter((email: any) => !email.isRead);
    const flaggedEmails = emails.filter((email: any) => email.flag?.flagStatus === 'flagged');
    const emailsWithAttachments = emails.filter((email: any) => email.hasAttachments);
    
    console.log("📊 Email breakdown:");
    console.log(`  - Unread emails: ${unreadEmails.length}`);
    console.log(`  - Flagged emails: ${flaggedEmails.length}`);
    console.log(`  - Emails with attachments: ${emailsWithAttachments.length}`);
    console.log(`  - Total emails: ${emails.length}`);

    // Log detailed email information
    if (emails.length > 0) {
      console.log("📧 Detailed email analysis:");
      emails.forEach((email: any, index: number) => {
        console.log(`  Email ${index + 1}:`);
        console.log(`    - ID: ${email.id}`);
        console.log(`    - Subject: ${email.subject || 'No Subject'}`);
        console.log(`    - From: ${email.from?.emailAddress?.address || 'No sender'}`);
        console.log(`    - Received: ${email.receivedDateTime || 'No date'}`);
        console.log(`    - Is Read: ${email.isRead || false}`);
        console.log(`    - Has Attachments: ${email.hasAttachments || false}`);
        console.log(`    - Importance: ${email.importance || 'normal'}`);
        console.log(`    - Categories: ${email.categories?.join(', ') || 'No categories'}`);
        console.log(`    - Flag Status: ${email.flag?.flagStatus || 'notFlagged'}`);
        console.log(`    - Internet Message ID: ${email.internetMessageId || 'None'}`);
        console.log(`    - Conversation ID: ${email.conversationId || 'None'}`);
      });
    } else {
      console.log("⚠️ No emails found in the test response");
    }

    // Check existing emails in database
    const { data: existingEmails, error: dbError } = await supabase
      .from("incoming_emails")
      .select("outlook_message_id, subject, from_email, received_at, is_read, is_deleted")
      .eq("user_id", user.id)
      .order("received_at", { ascending: false })
      .limit(10);

    if (dbError) {
      console.error("⚠️ Could not fetch existing emails:", dbError);
    } else {
      console.log("💾 Existing emails in database:", existingEmails?.length || 0);
      if (existingEmails && existingEmails.length > 0) {
        console.log("📧 Sample existing emails:");
        existingEmails.slice(0, 3).forEach((email: any, index: number) => {
          console.log(`  DB Email ${index + 1}:`);
          console.log(`    - Outlook Message ID: ${email.outlook_message_id}`);
          console.log(`    - Subject: ${email.subject}`);
          console.log(`    - From Email: ${email.from_email}`);
          console.log(`    - Received At: ${email.received_at}`);
          console.log(`    - Is Read: ${email.is_read}`);
          console.log(`    - Is Deleted: ${email.is_deleted}`);
        });
      }
    }

    const testResults = {
      message: "Email sync test completed successfully",
      user_info: {
        id: userInfo.id,
        displayName: userInfo.displayName,
        mail: userInfo.mail
      },
      api_test: {
        status: "success",
        response_status: response.status,
        emails_received: emails.length,
        unread_emails: unreadEmails.length,
        flagged_emails: flaggedEmails.length,
        emails_with_attachments: emailsWithAttachments.length
      },
      database_test: {
        existing_emails: existingEmails?.length || 0,
        error: dbError ? dbError.message : null
      },
      debug_info: {
        api_url: graphApiUrl,
        token_expires_at: tokens.expires_at,
        test_timestamp: new Date().toISOString()
      }
    };

    console.log("🎉 Email sync test completed successfully");
    console.log("📊 Test results summary:", testResults);

    return NextResponse.json(testResults);

  } catch (error) {
    console.error("❌ Email sync test error:", error);
    return NextResponse.json({ 
      error: "Internal server error during email sync test",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 