import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/outlookAuth";
import { Client } from "@microsoft/microsoft-graph-client";
import { createClient } from "@supabase/supabase-js";
import "isomorphic-fetch";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    console.log("🔄 Starting inbox sync...");
    
    const body = await req.json();
    const { forceSync = false, previewOnly = false } = body;

    // Get access token for Microsoft Graph
    const accessToken = await getAccessToken();
    const client = Client.init({
      authProvider: (done) => done(null, accessToken)
    });

    // Get last sync time from database
    const { data: syncState } = await supabase
      .from("email_sync_state")
      .select("last_sync_time")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const lastSyncTime = syncState?.last_sync_time || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filterDate = lastSyncTime.toISOString();

    console.log(`📅 Syncing emails since: ${filterDate}`);

    // Fetch new emails from Outlook
    const messages = await client
      .api("/users/eleanor.oxley@blociq.co.uk/messages")
      .filter(`receivedDateTime gt '${filterDate}'`)
      .select("id,subject,from,toRecipients,ccRecipients,body,bodyPreview,internetMessageId,conversationId,receivedDateTime,isRead")
      .orderby("receivedDateTime DESC")
      .top(50) // Limit to prevent rate limiting
      .get();

    console.log(`📧 Found ${messages.value.length} new emails`);

    const results = [];
    let emailsProcessed = 0;
    let emailsNew = 0;
    let emailsUpdated = 0;

    for (const msg of messages.value) {
      try {
        // Parse email data
        const emailData = {
          outlook_message_id: msg.id,
          message_id: msg.internetMessageId,
          thread_id: msg.conversationId,
          subject: msg.subject || "(No subject)",
          from_email: msg.from?.emailAddress?.address,
          from_name: msg.from?.emailAddress?.name,
          to_email: msg.toRecipients?.map((r: any) => r.emailAddress.address) || [],
          cc_email: msg.ccRecipients?.map((r: any) => r.emailAddress.address) || [],
          body: msg.body?.content || msg.bodyPreview || "",
          body_preview: msg.bodyPreview || "",
          received_at: msg.receivedDateTime,
          is_read: msg.isRead || false,
          is_handled: false,
          folder: "inbox",
          sync_status: "synced",
          last_sync_at: new Date().toISOString()
        };

        // Check if email already exists
        const { data: existingEmail } = await supabase
          .from("incoming_emails")
          .select("id, is_read, is_handled")
          .eq("outlook_message_id", msg.id)
          .single();

        if (existingEmail) {
          // Update existing email (e.g., read status)
          if (!previewOnly) {
            const { error } = await supabase
              .from("incoming_emails")
              .update({
                is_read: emailData.is_read,
                last_sync_at: emailData.last_sync_at,
                sync_status: emailData.sync_status
              })
              .eq("outlook_message_id", msg.id);

            if (error) {
              console.error(`❌ Failed to update email ${msg.id}:`, error);
              results.push({ email: emailData, status: "update_error", error });
            } else {
              emailsUpdated++;
              results.push({ email: emailData, status: "updated" });
            }
          } else {
            results.push({ email: emailData, status: "preview_update" });
          }
        } else {
          // Match leaseholder email to unit/building
          if (emailData.from_email) {
            const { data: unitMatch } = await supabase
              .from("units")
              .select("unit_number, building_id, buildings(name)")
              .eq("leaseholder_email", emailData.from_email)
              .single();

            if (unitMatch) {
              emailData.unit = unitMatch.unit_number;
              emailData.building_id = unitMatch.building_id;
              emailData.building_name = unitMatch.buildings?.name;
              console.log(`🏢 Matched: ${emailData.from_email} → ${emailData.unit}, building ${emailData.building_id}`);
            } else {
              // Fallback: match "Flat 7" in subject
              const match = emailData.subject?.match(/flat\s?(\d+[A-Za-z]?)/i);
              if (match) {
                const flat = `Flat ${match[1]}`;
                const { data: fallbackUnit } = await supabase
                  .from("units")
                  .select("unit_number, building_id, buildings(name)")
                  .eq("unit_number", flat)
                  .single();

                if (fallbackUnit) {
                  emailData.unit = fallbackUnit.unit_number;
                  emailData.building_id = fallbackUnit.building_id;
                  emailData.building_name = fallbackUnit.buildings?.name;
                  console.log(`🏢 Fallback matched subject to unit: ${emailData.unit}`);
                }
              }
            }
          }

          // Insert new email
          if (!previewOnly) {
            const { error } = await supabase
              .from("incoming_emails")
              .insert(emailData);

            if (error) {
              console.error(`❌ Failed to insert email ${msg.id}:`, error);
              results.push({ email: emailData, status: "insert_error", error });
            } else {
              emailsNew++;
              results.push({ email: emailData, status: "inserted" });
            }
          } else {
            results.push({ email: emailData, status: "preview_insert" });
          }
        }

        emailsProcessed++;
      } catch (error) {
        console.error(`❌ Error processing email ${msg.id}:`, error);
        results.push({ email: msg, status: "error", error });
      }
    }

    // Update sync state
    if (!previewOnly) {
      const { error: syncError } = await supabase
        .from("email_sync_state")
        .insert({
          last_sync_time: new Date().toISOString(),
          sync_status: "completed",
          emails_processed: emailsProcessed,
          emails_new: emailsNew,
          emails_updated: emailsUpdated
        });

      if (syncError) {
        console.error("❌ Failed to update sync state:", syncError);
      }
    }

    console.log(`✅ Sync completed: ${emailsProcessed} processed, ${emailsNew} new, ${emailsUpdated} updated`);

    return NextResponse.json({
      success: true,
      previewOnly,
      summary: {
        processed: emailsProcessed,
        new: emailsNew,
        updated: emailsUpdated,
        errors: results.filter(r => r.status.includes('error')).length
      },
      results
    });

  } catch (error) {
    console.error("❌ Inbox sync failed:", error);
    
    // Log error in sync state
    try {
      await supabase
        .from("email_sync_state")
        .insert({
          sync_status: "error",
          error_message: error instanceof Error ? error.message : "Unknown error"
        });
    } catch (logError) {
      console.error("Failed to log sync error:", logError);
    }

    return NextResponse.json(
      { error: "Failed to sync inbox", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 