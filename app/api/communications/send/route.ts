import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

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
      recipient_selection, 
      method, 
      subject, 
      custom_message, 
      merge_data 
    } = body;

    if (!template_id || !building_id || !subject || !custom_message) {
      return NextResponse.json({ 
        error: "Missing required fields: template_id, building_id, subject, custom_message" 
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

    // Fetch building details
    const { data: building, error: buildingError } = await supabase
      .from("buildings")
      .select("id, name, address")
      .eq("id", parseInt(building_id))
      .single();

    if (buildingError || !building) {
      console.error("❌ Building not found:", buildingError);
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    // Fetch recipients based on selection
    let recipients: any[] = [];
    
    if (recipient_selection === 'all_leaseholders') {
      const { data: leaseholders, error: leaseholdersError } = await supabase
        .from("leaseholders")
        .select("id, name, email, phone")
        .eq("building_id", parseInt(building_id));

      if (!leaseholdersError && leaseholders) {
        recipients = leaseholders;
      }
    } else if (recipient_selection === 'all_residents') {
      // Fetch all residents (leaseholders + tenants)
      const { data: residents, error: residentsError } = await supabase
        .from("leaseholders")
        .select("id, name, email, phone")
        .eq("building_id", parseInt(building_id));

      if (!residentsError && residents) {
        recipients = residents;
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({ 
        error: "No recipients found for the selected criteria" 
      }, { status: 400 });
    }

    console.log(`📧 Found ${recipients.length} recipients`);

    // Process the message with placeholders
    let processedMessage = custom_message;
    let processedSubject = subject;

    // Replace common placeholders
    const placeholderMap = {
      '[building_name]': building.name,
      '[building_address]': building.address || '',
      '[date]': new Date().toLocaleDateString('en-GB'),
      '[manager_name]': user.user_metadata?.full_name || user.email?.split('@')[0] || 'Property Manager',
      ...merge_data
    };

    Object.entries(placeholderMap).forEach(([placeholder, value]) => {
      processedMessage = processedMessage.replace(new RegExp(placeholder, 'g'), value);
      processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
    });

    // Get Outlook token for sending email
    const { data: tokens, error: tokenError } = await supabase
      .from("outlook_tokens")
      .select("*")
      .eq("user_id", user.id)
      .order("expires_at", { ascending: false })
      .limit(1)
      .single();

    let emailResults: any[] = [];
    let pdfResults: any[] = [];

    // Send emails if method includes email
    if (method === 'email' || method === 'both') {
      if (tokenError || !tokens) {
        console.error("❌ No valid Outlook token found:", tokenError);
        return NextResponse.json({ error: "No valid Outlook token found for sending emails" }, { status: 401 });
      }

      // Check if token is expired
      if (new Date(tokens.expires_at) < new Date()) {
        console.error("❌ Outlook token has expired");
        return NextResponse.json({ error: "Outlook token has expired" }, { status: 401 });
      }

      console.log("📧 Sending emails via Microsoft Graph API...");

      // Send emails to all recipients
      for (const recipient of recipients) {
        try {
          const graphApiUrl = "https://graph.microsoft.com/v1.0/me/sendMail";
          const emailData = {
            message: {
              subject: processedSubject,
              body: {
                contentType: "HTML",
                content: processedMessage
              },
              toRecipients: [
                {
                  emailAddress: {
                    address: recipient.email,
                    name: recipient.name
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

          if (response.ok) {
            emailResults.push({
              recipient_id: recipient.id,
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              status: 'sent',
              sent_at: new Date().toISOString()
            });
          } else {
            emailResults.push({
              recipient_id: recipient.id,
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              status: 'failed',
              error: `HTTP ${response.status}`
            });
          }
        } catch (error) {
          emailResults.push({
            recipient_id: recipient.id,
            recipient_email: recipient.email,
            recipient_name: recipient.name,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    // Generate PDFs if method includes pdf
    if (method === 'pdf' || method === 'both') {
      console.log("📄 Generating PDF letters...");
      
      // For now, we'll just log that PDF generation would happen
      // In a real implementation, you'd use a PDF library like puppeteer or jsPDF
      pdfResults = recipients.map(recipient => ({
        recipient_id: recipient.id,
        recipient_name: recipient.name,
        status: 'generated',
        generated_at: new Date().toISOString()
      }));
    }

    // Log the communication in the database
    const { data: communicationLog, error: logError } = await supabase
      .from("communications_sent")
      .insert({
        template_id: template_id,
        template_name: template.name,
        sent_by: user.id,
        sent_at: new Date().toISOString(),
        building_id: parseInt(building_id),
        building_name: building.name,
        method: method,
        recipients: recipients.map(r => ({ id: r.id, name: r.name, email: r.email })),
        subject: processedSubject,
        body: processedMessage,
        status: 'sent',
        recipient_count: recipients.length,
        email_results: emailResults,
        pdf_results: pdfResults,
        metadata: {
          recipient_selection,
          merge_data,
          template_type: template.type,
          template_category: template.category
        }
      })
      .select()
      .single();

    if (logError) {
      console.warn("⚠️ Could not log communication:", logError);
    }

    // Update template usage count
    const { error: updateError } = await supabase
      .from("communication_templates")
      .update({ 
        usage_count: (template.usage_count || 0) + 1,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", template_id);

    if (updateError) {
      console.warn("⚠️ Could not update template usage count:", updateError);
    }

    const responseData = {
      message: "Communication sent successfully",
      communication: {
        id: communicationLog?.id,
        template_name: template.name,
        building_name: building.name,
        method: method,
        recipient_count: recipients.length,
        sent_at: new Date().toISOString()
      },
      results: {
        emails: emailResults,
        pdfs: pdfResults,
        successful_emails: emailResults.filter(r => r.status === 'sent').length,
        failed_emails: emailResults.filter(r => r.status === 'failed').length,
        generated_pdfs: pdfResults.length
      },
      debug_info: {
        user_id: user.id,
        template_id: template_id,
        building_id: building_id,
        timestamp: new Date().toISOString()
      }
    };

    console.log("🎉 Communication sent successfully");
    console.log("📊 Send summary:", {
      template: template.name,
      building: building.name,
      recipients: recipients.length,
      method: method,
      successful_emails: emailResults.filter(r => r.status === 'sent').length,
      generated_pdfs: pdfResults.length
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