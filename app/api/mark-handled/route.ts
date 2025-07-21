import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/outlookAuth";
import { Client } from "@microsoft/microsoft-graph-client";
import { createClient } from "@supabase/supabase-js";
import "isomorphic-fetch";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      messageId, 
      userId = "system",
      moveToFolder = "handled",
      customFolderName = null 
    } = body;

    if (!messageId) {
      return NextResponse.json({ 
        error: "Message ID is required" 
      }, { status: 400 });
    }

    console.log(`🏷️ Marking email ${messageId} as handled...`);

    // Get the email from database
    const { data: email, error: fetchError } = await supabase
      .from("incoming_emails")
      .select("*")
      .eq("message_id", messageId)
      .single();

    if (fetchError || !email) {
      return NextResponse.json({ 
        error: "Email not found" 
      }, { status: 404 });
    }

    // Get access token for Microsoft Graph
    const accessToken = await getValidAccessToken();
    const client = Client.init({
      authProvider: (done) => done(null, accessToken)
    });

    let destinationFolderId = null;

    // Get or create the destination folder
    try {
      if (moveToFolder === "handled") {
        // Try to find existing "BlocIQ/Handled" folder
        const folders = await client
          .api("/users/eleanor.oxley@blociq.co.uk/mailFolders")
          .filter("displayName eq 'BlocIQ/Handled'")
          .get();

        if (folders.value.length > 0) {
          destinationFolderId = folders.value[0].id;
        } else {
          // Create the "BlocIQ/Handled" folder
          const newFolder = await client
            .api("/users/eleanor.oxley@blociq.co.uk/mailFolders")
            .post({
              displayName: "BlocIQ/Handled",
              parentFolderId: "inbox"
            });

          destinationFolderId = newFolder.id;
          console.log(`📁 Created new folder: BlocIQ/Handled (${destinationFolderId})`);
        }
      } else if (customFolderName) {
        // Try to find or create custom folder
        const folders = await client
          .api("/users/eleanor.oxley@blociq.co.uk/mailFolders")
          .filter(`displayName eq '${customFolderName}'`)
          .get();

        if (folders.value.length > 0) {
          destinationFolderId = folders.value[0].id;
        } else {
          // Create custom folder
          const newFolder = await client
            .api("/users/eleanor.oxley@blociq.co.uk/mailFolders")
            .post({
              displayName: customFolderName,
              parentFolderId: "inbox"
            });

          destinationFolderId = newFolder.id;
          console.log(`📁 Created new folder: ${customFolderName} (${destinationFolderId})`);
        }
      }

      // Move the email to the destination folder
      if (destinationFolderId && email.outlook_message_id) {
        await client
          .api(`/users/eleanor.oxley@blociq.co.uk/messages/${email.outlook_message_id}/move`)
          .post({
            destinationId: destinationFolderId
          });

        console.log(`📧 Moved email to folder: ${destinationFolderId}`);
      }

    } catch (graphError) {
      console.error("❌ Microsoft Graph error:", graphError);
      // Continue with database update even if Graph operation fails
    }

    // Update database record
    const updateData = {
      handled: true,
      // Note: Using tag field to store additional info since handled_at, handled_by don't exist
      tag: moveToFolder === "handled" ? "handled" : customFolderName || "processed"
    };

    const { error: updateError } = await supabase
      .from("incoming_emails")
      .update(updateData)
      .eq("message_id", messageId);

    if (updateError) {
      console.error("❌ Failed to update email status:", updateError);
      return NextResponse.json({ 
        error: "Failed to update email status" 
      }, { status: 500 });
    }

    // Log the action in communications_sent if building_id exists
    if (email.building_id) {
      try {
        await supabase
          .from("communications_sent")
          .insert({
            building_id: email.building_id,
            type: "email_handled",
            recipient: email.from_email,
            subject: email.subject,
            content: `Email marked as handled: ${email.subject}`,
            sent_by: userId,
            sent_at: new Date().toISOString(),
            related_email_id: messageId
          });
      } catch (commError) {
        console.error("Failed to log communication:", commError);
      }
    }

    console.log(`✅ Email ${messageId} marked as handled successfully`);

    return NextResponse.json({
      success: true,
      messageId,
      folder: updateData.tag,
      handledAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Mark as handled failed:", error);
    return NextResponse.json(
      { error: "Failed to mark email as handled" },
      { status: 500 }
    );
  }
} 