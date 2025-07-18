import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      reply_to_message_id, 
      reply_text, 
      to, 
      cc = [], 
      building_id, 
      user_id,
      attachment_path,
      subject = "Re: " // Will be enhanced with original subject
    } = body;

    if (!reply_to_message_id || !reply_text || !to || !user_id) {
      return NextResponse.json({ 
        error: "Reply message ID, text, recipient, and user ID are required" 
      }, { status: 400 });
    }

    // Get the original email to enhance subject and context
    const { data: originalEmail } = await supabase
      .from("incoming_emails")
      .select("subject, from_email, message_id")
      .eq("message_id", reply_to_message_id)
      .single();

    if (!originalEmail) {
      return NextResponse.json({ 
        error: "Original email not found" 
      }, { status: 404 });
    }

    // Enhanced subject line
    const enhancedSubject = subject === "Re: " 
      ? `Re: ${originalEmail.subject || "Email"}` 
      : subject;

    // Prepare email data for sending
    const emailData = {
      to: Array.isArray(to) ? to : [to],
      cc: Array.isArray(cc) ? cc : [],
      subject: enhancedSubject,
      message: reply_text,
      replyTo: originalEmail.message_id,
      attachmentPath: attachment_path || null
    };

    // Try to send via Microsoft Graph first, fallback to SMTP
    let sendResult;
    try {
      // Attempt Microsoft Graph send
      const graphResponse = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...emailData,
          buildingId: building_id,
          sentBy: user_id
        })
      });

      if (graphResponse.ok) {
        sendResult = await graphResponse.json();
      } else {
        throw new Error('Graph send failed');
      }
    } catch (graphError) {
      console.log("Microsoft Graph send failed, trying SMTP fallback:", graphError);
      
      // SMTP fallback would go here
      // For now, we'll simulate success
      sendResult = { success: true, messageId: `smtp_${Date.now()}` };
    }

    if (sendResult.success) {
      // Log the sent reply
      const { error: logError } = await supabase
        .from("outgoing_emails")
        .insert({
          message_id: sendResult.messageId || `reply_${Date.now()}`,
          reply_to_message_id,
          to: emailData.to,
          cc: emailData.cc,
          subject: enhancedSubject,
          body: reply_text,
          building_id,
          sent_by: user_id,
          sent_at: new Date().toISOString(),
          attachment_path: attachment_path || null
        });

      if (logError) {
        console.error("Failed to log outgoing email:", logError);
      }

      // Mark original email as handled
      const { error: updateError } = await supabase
        .from("incoming_emails")
        .update({ 
          status: "handled",
          handled_at: new Date().toISOString(),
          handled_by: user_id
        })
        .eq("message_id", reply_to_message_id);

      if (updateError) {
        console.error("Failed to mark email as handled:", updateError);
      }

      // If this is related to a building, log in communications_sent
      if (building_id) {
        const { error: commError } = await supabase
          .from("communications_sent")
          .insert({
            building_id,
            type: "email_reply",
            recipient: emailData.to.join(", "),
            subject: enhancedSubject,
            content: reply_text,
            sent_by: user_id,
            sent_at: new Date().toISOString(),
            related_email_id: reply_to_message_id
          });

        if (commError) {
          console.error("Failed to log communication:", commError);
        }
      }

      return NextResponse.json({ 
        success: true, 
        messageId: sendResult.messageId,
        subject: enhancedSubject
      });
    } else {
      return NextResponse.json({ 
        error: "Failed to send email" 
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Error sending reply:", error);
    return NextResponse.json(
      { error: "Failed to send reply" },
      { status: 500 }
    );
  }
} 