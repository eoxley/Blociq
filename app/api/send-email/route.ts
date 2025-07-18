import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    console.log("📧 Sending email with attachment...");
    
    const body = await req.json();
    const { 
      to, 
      subject, 
      message = '', 
      attachmentPath, 
      templateId, 
      buildingId,
      sentBy = 'system'
    } = body;

    // Validate required parameters
    if (!to || !subject || !attachmentPath) {
      return NextResponse.json({ 
        error: 'Recipient email, subject, and attachment path are required' 
      }, { status: 400 });
    }

    console.log("✅ Valid request received:", { to, subject, attachmentPath });

    // 1. Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('generated')
      .download(attachmentPath);

    if (downloadError || !fileData) {
      console.error("❌ Failed to download attachment:", downloadError);
      return NextResponse.json({ 
        error: 'Failed to download attachment file' 
      }, { status: 500 });
    }

    console.log("📥 Attachment downloaded successfully");

    // 2. Try Outlook SMTP first (if configured)
    let emailSent = false;
    let emailError = null;

    if (process.env.OUTLOOK_SMTP_HOST && process.env.OUTLOOK_SMTP_USER && process.env.OUTLOOK_SMTP_PASS) {
      try {
        emailSent = await sendViaOutlookSMTP(to, subject, message, fileData, attachmentPath);
        console.log("✅ Email sent via Outlook SMTP");
      } catch (error) {
        console.error("❌ Outlook SMTP failed:", error);
        emailError = error;
      }
    }

    // 3. Fallback to Supabase email extension
    if (!emailSent) {
      try {
        emailSent = await sendViaSupabaseEmail(to, subject, message, fileData, attachmentPath);
        console.log("✅ Email sent via Supabase email extension");
      } catch (error) {
        console.error("❌ Supabase email failed:", error);
        emailError = error;
      }
    }

    if (!emailSent) {
      return NextResponse.json({ 
        error: 'Failed to send email via all available methods',
        details: emailError instanceof Error ? emailError.message : 'Unknown error'
      }, { status: 500 });
    }

    // 4. Log the sent email to database
    const { error: logError } = await supabase
      .from('communications_sent')
      .insert({
        to: to,
        subject: subject,
        message: message,
        template_id: templateId,
        building_id: buildingId,
        attachment_path: attachmentPath,
        sent_by: sentBy,
        sent_at: new Date().toISOString()
      });

    if (logError) {
      console.error("⚠️ Failed to log sent email:", logError);
      // Don't fail the request, just log the error
    }

    console.log("✅ Email sent and logged successfully");

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      recipient: to,
      subject: subject
    });

  } catch (error) {
    console.error('❌ Email sending error:', error);
    return NextResponse.json({ 
      error: 'Failed to send email',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
}

// Outlook SMTP email sending function
async function sendViaOutlookSMTP(
  to: string, 
  subject: string, 
  message: string, 
  attachment: Blob, 
  filename: string
): Promise<boolean> {
  // This would use a library like nodemailer with Outlook SMTP
  // For now, we'll return false to trigger the fallback
  console.log("📧 Attempting Outlook SMTP send...");
  
  // TODO: Implement actual SMTP sending
  // const nodemailer = require('nodemailer');
  // const transporter = nodemailer.createTransporter({
  //   host: process.env.OUTLOOK_SMTP_HOST,
  //   port: 587,
  //   secure: false,
  //   auth: {
  //     user: process.env.OUTLOOK_SMTP_USER,
  //     pass: process.env.OUTLOOK_SMTP_PASS
  //   }
  // });
  
  return false; // Fallback to Supabase email
}

// Supabase email extension sending function
async function sendViaSupabaseEmail(
  to: string, 
  subject: string, 
  message: string, 
  attachment: Blob, 
  filename: string
): Promise<boolean> {
  try {
    // Convert blob to base64 for email attachment
    const arrayBuffer = await attachment.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    // Use Supabase's email function (requires email extension to be set up)
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: to,
        subject: subject,
        html: message || '<p>Please find the attached document.</p>',
        attachments: [{
          filename: filename.split('/').pop() || 'document.docx',
          content: base64,
          encoding: 'base64'
        }]
      }
    });

    if (error) {
      console.error("❌ Supabase email function error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Supabase email sending error:", error);
    return false;
  }
} 