import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { getValidAccessToken, makeGraphRequest } from "@/lib/outlookAuth";

export async function POST(req: NextRequest) {
  try {
    console.log("📁 Starting email filing process...");
    
    const supabase = createClient(cookies());
    
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

    if (!outlook_id) {
      console.error("❌ Missing outlook_id in request");
      return NextResponse.json({ error: "outlook_id is required" }, { status: 400 });
    }

    console.log("📧 Filing email:", { email_id, outlook_id });

    // Get valid Outlook access token using utility function
    let accessToken: string;
    try {
      accessToken = await getValidAccessToken();
      console.log("✅ Valid Outlook access token obtained");
    } catch (error) {
      console.error("❌ Failed to get valid Outlook access token:", error);
      return NextResponse.json({ error: "Missing or expired Outlook token" }, { status: 403 });
    }

    // Step 1: Get the "Filed" folder ID from Outlook
    console.log("📂 Getting 'Filed' folder ID from Outlook...");
    
    const foldersResponse = await makeGraphRequest('/me/mailFolders');
    
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
      const createFolderResponse = await makeGraphRequest('/me/mailFolders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      
      // Note: Could store the folder ID for future use, but for now we'll look it up each time
      // This avoids the need for an additional table that's not in the schema yet
    } else {
      folderId = filedFolder.id;
      console.log("✅ Found existing 'Filed' folder:", folderId);
    }

    // Step 2: Move the email in Outlook
    console.log("📧 Moving email in Outlook to 'Filed' folder...");
    
    const moveResponse = await makeGraphRequest(`/me/messages/${outlook_id}/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destinationId: folderId
      }),
    });

    if (!moveResponse.ok) {
      const errorData = await moveResponse.json();
      console.error("❌ Error moving email in Outlook:", errorData);
      return NextResponse.json({ 
        error: "Failed to move email in Outlook", 
        details: errorData 
      }, { status: moveResponse.status });
    }

    console.log("✅ Email moved to 'Filed' folder in Outlook");

    // Step 3: Update Supabase to mark email as filed
    console.log("💾 Updating Supabase to mark email as filed...");
    
    const { data: updateData, error: updateError } = await supabase
      .from("incoming_emails")
      .update({ 
        filed: true,
        updated_at: new Date().toISOString()
      } as any)
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
      success: true,
      message: "Email filed successfully",
      email_id,
      outlook_id,
      filed: true,
      filed_at: new Date().toISOString(),
      outlook_moved: true
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