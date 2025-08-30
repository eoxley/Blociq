import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    console.log("📧 Sending compliance reminder email...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Parse the request body
    const body = await req.json();
    const { building_id, compliance_asset_id } = body;

    if (!building_id) {
      return NextResponse.json({ 
        error: "Missing required field: building_id" 
      }, { status: 400 });
    }

    // Fetch building details
    const { data: building, error: buildingError } = await supabase
      .from("buildings")
      .select("id, name, address, building_manager_name, building_manager_email")
      .eq("id", parseInt(building_id))
      .single();

    if (buildingError || !building) {
      console.error("❌ Building not found:", buildingError);
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    // Fetch compliance asset details if specified
    let assetDetails = null;
    if (compliance_asset_id) {
      const { data: buildingAsset, error: assetError } = await supabase
        .from("building_assets")
        .select(`
          *,
          compliance_items (
            id,
            item_type,
            category,
            frequency,
            assigned_to,
            notes
          )
        `)
        .eq("building_id", parseInt(building_id))
        .eq("compliance_item_id", parseInt(compliance_asset_id))
        .single();

      if (!assetError && buildingAsset) {
        assetDetails = {
          name: buildingAsset.compliance_items?.item_type || 'Unknown Asset',
          category: buildingAsset.compliance_items?.category || 'General',
          due_date: buildingAsset.next_due,
          days_overdue: buildingAsset.next_due ? 
            Math.ceil((new Date().getTime() - new Date(buildingAsset.next_due).getTime()) / (1000 * 60 * 60 * 24)) : 0
        };
      }
    }

    // Get user profile for sender details
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.warn("⚠️ Could not fetch user profile:", profileError);
    }

    // Prepare email content
    const assetName = assetDetails?.name || 'compliance requirements';
    const dueDate = assetDetails?.due_date ? new Date(assetDetails.due_date).toLocaleDateString('en-GB') : 'the required date';
    const managerName = building.building_manager_name || 'Property Manager';
    const managerEmail = building.building_manager_email;
    
    if (!managerEmail) {
      return NextResponse.json({ 
        error: "No manager email found for this building" 
      }, { status: 400 });
    }

    const emailSubject = `Compliance Reminder – ${assetName}`;
    const emailBody = `Dear ${managerName}

This is a reminder that the compliance asset "${assetName}" for ${building.name} is overdue or missing.  
Please arrange for the appropriate inspection or certification by ${dueDate} to maintain legal compliance.

${assetDetails && assetDetails.days_overdue > 0 ? `This item is ${assetDetails.days_overdue} days overdue.` : ''}

Kind regards  
BlocIQ Compliance System`;

    // Get Outlook token for sending email
    const { data: tokens, error: tokenError } = await supabase
      .from("outlook_tokens")
      .select("*")
      .eq("user_id", user.id)
      .order("expires_at", { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokens) {
      console.error("❌ No valid Outlook token found:", tokenError);
      return NextResponse.json({ error: "No valid Outlook token found for sending emails" }, { status: 401 });
    }

    // Check if token is expired
    if (new Date(tokens.expires_at) < new Date()) {
      console.error("❌ Outlook token has expired");
      return NextResponse.json({ error: "Outlook token has expired" }, { status: 401 });
    }

    // Send email via Microsoft Graph API
    console.log("📧 Sending email via Microsoft Graph API...");
    
    const graphApiUrl = "https://graph.microsoft.com/v1.0/me/sendMail";
    const emailData = {
      message: {
        subject: emailSubject,
        body: {
          contentType: "Text",
          content: emailBody
        },
        toRecipients: [
          {
            emailAddress: {
              address: managerEmail,
              name: managerName
            }
          }
        ]
      },
      saveToSentItems: true
    };

    const response = await fetch(graphApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Microsoft Graph API error:", errorData);
      return NextResponse.json({ 
        error: "Failed to send email via Outlook",
        details: errorData
      }, { status: response.status });
    }

    console.log("✅ Email sent successfully via Microsoft Graph API");

    // Log the reminder in the database (if compliance_reminders table exists)
    try {
      const { error: logError } = await supabase
        .from("compliance_reminders")
        .insert({
          building_id: parseInt(building_id),
          compliance_item_id: compliance_asset_id ? parseInt(compliance_asset_id) : null,
          reminder_type: 'overdue_reminder',
          message: emailBody,
          sent_to: managerEmail,
          sent_by: user.id,
          status: 'sent',
          created_at: new Date().toISOString()
        });

      if (logError) {
        console.warn("⚠️ Could not log reminder to database:", logError);
      }
    } catch (error) {
      console.warn("⚠️ Compliance reminders table may not exist:", error);
    }

    // Update building asset notes to record reminder sent
    if (compliance_asset_id) {
      const { error: updateError } = await supabase
        .from("building_assets")
        .update({ 
          notes: `Reminder sent: ${new Date().toLocaleDateString('en-GB')} - ${emailSubject}`,
          updated_at: new Date().toISOString()
        })
        .eq("building_id", parseInt(building_id))
        .eq("compliance_item_id", parseInt(compliance_asset_id));

      if (updateError) {
        console.warn("⚠️ Could not update building asset notes:", updateError);
      }
    }

    const responseData = {
      message: "Compliance reminder email sent successfully",
      email: {
        to: managerEmail,
        subject: emailSubject,
        sent_at: new Date().toISOString()
      },
      asset: assetDetails,
      building: {
        id: building.id,
        name: building.name,
        address: building.address
      },
      debug_info: {
        user_id: user.id,
        sender_name: userProfile?.full_name || 'Unknown',
        timestamp: new Date().toISOString()
      }
    };

    console.log("🎉 Compliance reminder email sent successfully");
    console.log("📧 Email details:", {
      to: managerEmail,
      subject: emailSubject,
      asset: assetDetails?.name || 'General compliance'
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Compliance reminder email error:", error);
    return NextResponse.json({ 
      error: "Internal server error during email send",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 