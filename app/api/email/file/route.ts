import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    console.log("📁 Starting email filing process...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Parse request body
    const { email_id, outlook_id } = await req.json();
    
    if (!email_id) {
      console.error("❌ Missing email_id in request");
      return NextResponse.json({ error: "email_id is required" }, { status: 400 });
    }

    console.log("📧 Filing email:", { email_id, outlook_id });

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

    // Step 1: Get the "Filed" folder ID from Outlook
    console.log("📂 Getting 'Filed' folder ID from Outlook...");
    
    const foldersResponse = await fetch('https://graph.microsoft.com/v1.0/me/mailFolders', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!foldersResponse.ok) {
      const errorData = await foldersResponse.json();
      console.error("❌ Error fetching mail folders:", errorData);
      return NextResponse.json({ 
        error: "Failed to fetch mail folders from Outlook",
        details: errorData
      }, { status: foldersResponse.status });
    }

    const foldersData = await foldersResponse.json();
    const filedFolder = foldersData.value?.find((folder: any) => 
      folder.displayName?.toLowerCase() === 'filed'
    );

    let folderId: string;

    if (!filedFolder) {
      console.log("📂 'Filed' folder not found, creating it...");
      
      // Create the "Filed" folder
      const createFolderResponse = await fetch('https://graph.microsoft.com/v1.0/me/mailFolders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: "Filed",
          parentFolderId: "msgfolderroot"
        }),
      });

      if (!createFolderResponse.ok) {
        const errorData = await createFolderResponse.json();
        console.error("❌ Error creating 'Filed' folder:", errorData);
        return NextResponse.json({ 
          error: "Failed to create 'Filed' folder in Outlook",
          details: errorData
        }, { status: createFolderResponse.status });
      }

      const newFolderData = await createFolderResponse.json();
      folderId = newFolderData.id;
      console.log("✅ Created 'Filed' folder:", folderId);
      
      // Store the folder ID for future use
      await supabase
        .from("outlook_folders")
        .upsert({
          user_id: user.id,
          folder_name: "Filed",
          folder_id: folderId,
          created_at: new Date().toISOString()
        }, { onConflict: "user_id,folder_name" });
    } else {
      folderId = filedFolder.id;
      console.log("✅ Found existing 'Filed' folder:", folderId);
    }

    // Step 2: Move the email in Outlook (if outlook_id is provided)
    if (outlook_id) {
      console.log("📧 Moving email in Outlook to 'Filed' folder...");
      
      const moveResponse = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${outlook_id}/move`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destinationId: folderId
        }),
      });

      if (!moveResponse.ok) {
        const errorData = await moveResponse.json();
        console.error("❌ Error moving email in Outlook:", errorData);
        // Don't fail the entire operation if Outlook move fails
        console.warn("⚠️ Failed to move email in Outlook, but continuing with Supabase update");
      } else {
        console.log("✅ Email moved to 'Filed' folder in Outlook");
      }
    } else {
      console.log("⚠️ No outlook_id provided, skipping Outlook move");
    }

    // Step 3: Update Supabase to mark email as filed
    console.log("💾 Updating Supabase to mark email as filed...");
    
    const { data: updateData, error: updateError } = await supabase
      .from("incoming_emails")
      .update({ 
        filed: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", email_id)
      .select();

    if (updateError) {
      console.error("❌ Error updating Supabase:", updateError);
      return NextResponse.json({ 
        error: "Failed to update email in database",
        details: updateError
      }, { status: 500 });
    }

    console.log("✅ Email marked as filed in Supabase");

    const responseData = {
      message: "Email filed successfully",
      email_id,
      outlook_id,
      filed: true,
      filed_at: new Date().toISOString(),
      outlook_moved: !!outlook_id
    };

    console.log("🎉 Email filing completed successfully");
    console.log("📊 Filing summary:", responseData);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Email filing error:", error);
    return NextResponse.json({ 
      error: "Internal server error during email filing",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 