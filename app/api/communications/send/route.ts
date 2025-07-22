import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    console.log("📤 Sending communication...");
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ User authentication failed:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    const body = await req.json();
    const { 
      template_id, 
      building_id, 
      recipient_selection, 
      custom_message, 
      method, 
      subject,
      merge_data 
    } = body;

    console.log("📋 Received send data:", {
      template_id,
      building_id,
      recipient_selection,
      method,
      subject: subject ? `${subject.substring(0, 50)}...` : null,
      merge_data_keys: Object.keys(merge_data || {})
    });

    // Validation
    if (!template_id) {
      console.error("❌ Validation failed: Missing template_id");
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    if (!building_id) {
      console.error("❌ Validation failed: Missing building_id");
      return NextResponse.json({ error: "Building ID is required" }, { status: 400 });
    }

    if (!method || !['email', 'pdf', 'both'].includes(method)) {
      console.error("❌ Validation failed: Invalid method");
      return NextResponse.json({ error: "Valid method (email, pdf, both) is required" }, { status: 400 });
    }

    // Get template
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

    // Get building info
    const { data: building, error: buildingError } = await supabase
      .from("buildings")
      .select("id, name, address")
      .eq("id", building_id)
      .single();

    if (buildingError || !building) {
      console.error("❌ Building not found:", buildingError);
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    console.log("✅ Building found:", building.name);

    // Get recipients based on selection
    let recipients: any[] = [];
    
    if (recipient_selection === 'all_leaseholders') {
      const { data: units } = await supabase
        .from("units")
        .select(`
          id,
          unit_number,
          leaseholder_id,
          leaseholders!inner (
            name,
            email
          )
        `)
        .eq("building_id", building_id)
        .not("leaseholder_id", "is", null);

      recipients = units?.map(unit => ({
        type: 'leaseholder',
        id: unit.leaseholder_id,
        name: unit.leaseholders?.[0]?.name || `Leaseholder of ${unit.unit_number}`,
        email: unit.leaseholders?.[0]?.email,
        address: '', // Address not stored in leaseholders table
        unit_number: unit.unit_number,
        building_name: building.name
      })) || [];
    } else if (recipient_selection === 'all_residents') {
      const { data: units } = await supabase
        .from("units")
        .select("id, unit_number, occupier_name, occupier_email, occupier_address")
        .eq("building_id", building_id)
        .not("occupier_email", "is", null);

      recipients = units?.map(unit => ({
        type: 'resident',
        id: unit.id,
        name: unit.occupier_name || `Resident of ${unit.unit_number}`,
        email: unit.occupier_email,
        address: unit.occupier_address,
        unit_number: unit.unit_number,
        building_name: building.name
      })) || [];
    } else if (recipient_selection === 'specific_units' && merge_data?.unit_ids) {
      const { data: units } = await supabase
        .from("units")
        .select(`
          id, 
          unit_number, 
          leaseholder_id,
          occupier_name, 
          occupier_email, 
          occupier_address,
          leaseholders (
            name,
            email
          )
        `)
        .in("id", merge_data.unit_ids);

      recipients = units?.map(unit => ({
        type: 'unit',
        id: unit.id,
        name: unit.leaseholder_id && unit.leaseholders?.[0]?.name || unit.occupier_name || `Unit ${unit.unit_number}`,
        email: unit.leaseholder_id && unit.leaseholders?.[0]?.email || unit.occupier_email,
        address: unit.occupier_address || '',
        unit_number: unit.unit_number,
        building_name: building.name
      })) || [];
    }

    console.log("📧 Recipients found:", recipients.length);

    if (recipients.length === 0) {
      console.error("❌ No recipients found");
      return NextResponse.json({ error: "No recipients found for the selected criteria" }, { status: 400 });
    }

    // Process mail merge for each recipient
    const processedCommunications = recipients.map(recipient => {
      let processedBody = template.body;
      let processedSubject = subject || template.subject || '';

      // Replace merge fields
      const mergeFields = {
        '{{name}}': recipient.name,
        '{{unit}}': recipient.unit_number || '',
        '{{building}}': building.name,
        '{{building_address}}': building.address || '',
        '{{date}}': new Date().toLocaleDateString('en-GB'),
        '{{recipient_type}}': recipient.type,
        ...merge_data
      };

      // Replace all merge fields in body and subject
      Object.entries(mergeFields).forEach(([field, value]) => {
        const regex = new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        processedBody = processedBody.replace(regex, value || '');
        processedSubject = processedSubject.replace(regex, value || '');
      });

      return {
        ...recipient,
        processed_body: processedBody,
        processed_subject: processedSubject
      };
    });

    console.log("🔄 Mail merge completed for", processedCommunications.length, "recipients");

    // Create communication log entry
    const communicationLogData = {
      template_id,
      template_name: template.name,
      sent_by: user.id,
      building_id,
      building_name: building.name,
      method,
      recipients: processedCommunications,
      subject: processedCommunications[0]?.processed_subject || subject,
      body: processedCommunications[0]?.processed_body || template.body,
      status: 'sent',
      metadata: {
        recipient_selection,
        merge_data,
        custom_message,
        total_recipients: processedCommunications.length
      }
    };

    console.log("💾 Saving communication log...");

    const { data: communicationLog, error: logError } = await supabase
      .from("communications_log")
      .insert(communicationLogData)
      .select("*")
      .single();

    if (logError) {
      console.error("❌ Failed to save communication log:", logError);
      return NextResponse.json({ 
        error: "Failed to save communication log",
        details: (logError as any).message || "Unknown error"
      }, { status: 500 });
    }

    console.log("✅ Communication log saved");

    // Save individual recipient records
    const recipientRecords = processedCommunications.map(comm => ({
      communication_id: communicationLog.id,
      recipient_type: comm.type,
      recipient_id: comm.id,
      recipient_name: comm.name,
      recipient_email: comm.email,
      recipient_address: comm.address,
      unit_number: comm.unit_number,
      building_name: comm.building_name,
      status: 'sent'
    }));

    const { error: recipientsError } = await supabase
      .from("communication_recipients")
      .insert(recipientRecords);

    if (recipientsError) {
      console.warn("⚠️ Failed to save recipient records:", recipientsError);
    } else {
      console.log("✅ Recipient records saved");
    }

    // Send emails if method includes email
    if (method === 'email' || method === 'both') {
      console.log("📧 Sending emails via Outlook API...");
      
      try {
        // Get Outlook token
        const { data: tokens } = await supabase
          .from("outlook_tokens")
          .select("*")
          .eq("user_id", user.id)
          .order("expires_at", { ascending: false })
          .limit(1)
          .single();

        if (tokens && new Date(tokens.expires_at) > new Date()) {
          // Send emails via Microsoft Graph API
          const emailPromises = processedCommunications
            .filter(comm => comm.email)
            .map(async (comm) => {
              try {
                const emailData = {
                  subject: comm.processed_subject,
                  body: {
                    contentType: "HTML",
                    content: comm.processed_body
                  },
                  toRecipients: [
                    {
                      emailAddress: {
                        address: comm.email
                      }
                    }
                  ]
                };

                const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${tokens.access_token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    message: emailData,
                    saveToSentItems: true
                  })
                });

                return {
                  recipient: comm.email,
                  success: response.ok,
                  status: response.status
                };
              } catch (error) {
                return {
                  recipient: comm.email,
                  success: false,
                  error: error instanceof Error ? error.message : "Unknown error"
                };
              }
            });

          const emailResults = await Promise.all(emailPromises);
          const successfulEmails = emailResults.filter(result => result.success).length;
          
          console.log("📧 Email sending completed:", {
            total: emailResults.length,
            successful: successfulEmails,
            failed: emailResults.length - successfulEmails
          });
        } else {
          console.warn("⚠️ No valid Outlook token found, emails not sent");
        }
      } catch (emailError) {
        console.error("❌ Email sending error:", emailError);
      }
    }

    const responseData = {
      message: "Communication sent successfully",
      communication: {
        id: communicationLog.id,
        template_name: template.name,
        method,
        total_recipients: processedCommunications.length,
        sent_at: communicationLog.sent_at
      },
      summary: {
        emails_sent: method === 'email' || method === 'both' ? processedCommunications.filter(c => c.email).length : 0,
        pdfs_generated: method === 'pdf' || method === 'both' ? processedCommunications.length : 0,
        building: building.name
      },
      debug_info: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        template_id,
        building_id
      }
    };

    console.log("🎉 Communication sending completed successfully");
    return NextResponse.json(responseData, { status: 201 });

  } catch (error) {
    console.error("❌ Communication sending error:", error);
    return NextResponse.json({ 
      error: "Internal server error during communication sending",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 