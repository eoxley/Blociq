import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { generatePopulatedTemplate } from "@/utils/communications";
import { sendEmailViaOutlook } from "@/utils/email";

export async function POST(req: NextRequest) {
  try {
    console.log("📧 Sending communication...");
    
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
    const { 
      template_id, 
      building_id, 
      recipient_selection = 'all_leaseholders',
      method = 'email', 
      subject, 
      custom_message, 
      merge_data = {}
    } = body;

    if (!template_id || !building_id) {
      return NextResponse.json({ 
        error: "Missing required fields: template_id, building_id" 
      }, { status: 400 });
    }

    // Fetch template details
    const { data: template, error: templateError } = await supabase
      .from("communication_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (templateError || !template) {
      console.error("❌ Template not found:", templateError);
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    console.log("✅ Template found:", template.name);

    // Fetch building details
    console.log("🔍 Fetching building with ID:", building_id, "Type:", typeof building_id);
    
    // Handle building ID - could be numeric or UUID
    const buildingIdNum = parseInt(building_id);
    const isNumericBuildingId = !isNaN(buildingIdNum);
    
    let buildingQuery;
    if (isNumericBuildingId) {
      buildingQuery = supabase
        .from("buildings")
        .select("id, name, address")
        .eq("id", buildingIdNum);
    } else {
      // Handle UUID or string building IDs
      buildingQuery = supabase
        .from("buildings")
        .select("id, name, address")
        .eq("id", building_id);
    }
    
    const { data: building, error: buildingError } = await buildingQuery.single();

    if (buildingError || !building) {
      console.error("❌ Building not found:", buildingError);
      console.error("❌ Building ID used:", building_id);
      console.error("❌ Is numeric:", isNumericBuildingId);
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    console.log("✅ Building found:", building.name, "Building ID:", building.id);

    // Fetch recipients based on selection
    let recipients: any[] = [];
    
    if (recipient_selection === 'all_leaseholders') {
      // Get leaseholders for the selected building through units relationship
      console.log("🔍 Fetching leaseholders for building ID:", building.id);
      
      // Query leaseholders through the units table
      const { data: leaseholders, error: leaseError } = await supabase
        .from("leaseholders")
        .select(`
          id, 
          name, 
          email, 
          phone, 
          unit_id,
          units!inner (
            id,
            building_id
          )
        `)
        .eq("units.building_id", building.id);

      if (leaseError) {
        console.error("❌ Error fetching leaseholders:", leaseError);
        console.error("❌ Building ID used for leaseholders query:", building.id);
        return NextResponse.json({ 
          error: "Failed to fetch leaseholders", 
          details: leaseError 
        }, { status: 500 });
      }

      recipients = leaseholders || [];
      console.log(`📧 Found ${recipients.length} leaseholders`);
    } else if (recipient_selection === 'all_residents') {
      // Fetch all residents (leaseholders + tenants) through units relationship
      console.log("🔍 Fetching residents for building ID:", building.id);
      
      const { data: residents, error: residentsError } = await supabase
        .from("leaseholders")
        .select(`
          id, 
          name, 
          email, 
          phone, 
          unit_id,
          units!inner (
            id,
            building_id
          )
        `)
        .eq("units.building_id", building.id);

      if (!residentsError && residents) {
        recipients = residents;
      }
      
      console.log(`📧 Found ${recipients.length} residents`);
    }

    if (recipients.length === 0) {
      return NextResponse.json({ 
        error: "No recipients found for the selected criteria" 
      }, { status: 400 });
    }

    console.log(`📧 Found ${recipients.length} recipients`);

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

    console.log("✅ Outlook token validated");

    const failedRecipients: any[] = [];
    const successfulSends: any[] = [];

    // Send emails to all recipients
    for (const recipient of recipients) {
      try {
        // Generate populated message using utility function
        const populatedMessage = generatePopulatedTemplate(
          custom_message || template.body, 
          {
            leaseholder_name: recipient.name,
            resident_name: recipient.name,
            tenant_name: recipient.name,
            building_name: building.name,
            building_address: building.address || '',
            property_address: `${building.name}, ${building.address || ''}`,
            date: new Date().toLocaleDateString('en-GB'),
            manager_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Property Manager',
            manager_phone: user.user_metadata?.phone || '',
            manager_email: user.email || '',
            emergency_contact: 'Emergency: 0800 123 4567',
            emergency_phone: '0800 123 4567',
            ...merge_data
          }
        );

        // Send email via Outlook
        const emailResult = await sendEmailViaOutlook({
          to: recipient.email,
          subject: subject || template.subject,
          body: populatedMessage
        }, tokens);

        if (emailResult.success) {
          successfulSends.push({
            recipient_id: recipient.id,
            recipient_email: recipient.email,
            recipient_name: recipient.name,
            message_id: emailResult.messageId,
            sent_at: new Date().toISOString()
          });

          // Log successful communication
          await supabase.from("communications_sent").insert({
            template_id: template_id,
            template_name: template.name,
            sent_by: user.id,
            sent_at: new Date().toISOString(),
            building_id: parseInt(building_id),
            building_name: building.name,
            method: method,
            recipients: [{ id: recipient.id, name: recipient.name, email: recipient.email }],
            subject: subject || template.subject,
            body: populatedMessage,
            status: 'sent',
            recipient_count: 1,
            email_results: [{
              recipient_id: recipient.id,
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              status: 'sent',
              message_id: emailResult.messageId,
              sent_at: new Date().toISOString()
            }],
            metadata: {
              recipient_selection,
              merge_data,
              template_type: template.type,
              template_category: template.category
            }
          });

        } else {
          failedRecipients.push({
            email: recipient.email,
            name: recipient.name,
            reason: emailResult.error || 'Unknown error'
          });
        }

      } catch (error) {
        console.error(`❌ Error sending to ${recipient.email}:`, error);
        failedRecipients.push({
          email: recipient.email,
          name: recipient.name,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Update template usage count
    const { error: updateError } = await supabase
      .from("communication_templates")
      .update({ 
        usage_count: (template.usage_count || 0) + successfulSends.length,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", template_id);

    if (updateError) {
      console.warn("⚠️ Could not update template usage count:", updateError);
    }

    const responseData = {
      message: "Communication sending completed",
      communication: {
        template_name: template.name,
        building_name: building.name,
        method: method,
        recipient_count: recipients.length,
        successful_sends: successfulSends.length,
        failed_sends: failedRecipients.length,
        sent_at: new Date().toISOString()
      },
      results: {
        successful: successfulSends,
        failed: failedRecipients,
        total_recipients: recipients.length,
        success_rate: `${((successfulSends.length / recipients.length) * 100).toFixed(1)}%`
      },
      debug_info: {
        user_id: user.id,
        template_id: template_id,
        building_id: building_id,
        timestamp: new Date().toISOString()
      }
    };

    console.log("🎉 Communication sending completed");
    console.log("📊 Send summary:", {
      template: template.name,
      building: building.name,
      recipients: recipients.length,
      successful: successfulSends.length,
      failed: failedRecipients.length,
      success_rate: responseData.results.success_rate
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("❌ Communication send error:", error);
    return NextResponse.json({ 
      error: "Internal server error during communication send",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 