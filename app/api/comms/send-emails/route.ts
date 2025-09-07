/**
 * Batch Email Sender API
 * Sends emails to building recipients using mail-merge
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/server';
import { getTemplate } from '@/lib/comms/templates';
import { renderTemplate, RecipientData } from '@/lib/comms/merge';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's agency
    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'User not linked to agency' }, { status: 400 });
    }
    
    const { buildingId, templateId, testMode = false, testEmail } = await req.json();
    
    if (!buildingId || !templateId) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        message: 'buildingId and templateId are required'
      }, { status: 400 });
    }
    
    // Get template
    const template = await getTemplate(templateId, profile.agency_id);
    if (!template) {
      return NextResponse.json({ 
        error: 'Template not found',
        message: 'The specified template does not exist or you do not have access to it'
      }, { status: 404 });
    }
    
    if (template.type !== 'email') {
      return NextResponse.json({ 
        error: 'Invalid template type',
        message: 'Template must be an email template'
      }, { status: 400 });
    }
    
    // Get recipients for the building
    const { data: recipients, error: recipientsError } = await supabase
      .from('v_building_recipients')
      .select('*')
      .eq('building_id', buildingId)
      .eq('agency_id', profile.agency_id);
    
    if (recipientsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch recipients',
        message: recipientsError.message
      }, { status: 500 });
    }
    
    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ 
        error: 'No recipients found',
        message: 'No active leaseholders found for this building'
      }, { status: 404 });
    }
    
    // Filter and group recipients by email
    const emailGroups = groupRecipientsByEmail(recipients);
    
    const results = [];
    const errors = [];
    const warnings = [];
    
    // Process each email group
    for (const [email, emailRecipients] of emailGroups) {
      try {
        // Skip if email is empty or recipient has opted out
        if (!email || emailRecipients.some(r => r.opt_out_email)) {
          warnings.push({
            email,
            leaseholderIds: emailRecipients.map(r => r.leaseholder_id),
            warning: 'Skipped - no email or opted out'
          });
          continue;
        }
        
        // Use the first recipient as the primary recipient
        const primaryRecipient = emailRecipients[0];
        const recipientData = mapRecipientData(primaryRecipient);
        
        // Render template
        const mergeResult = renderTemplate(template, recipientData);
        
        if (mergeResult.errors.length > 0) {
          errors.push({
            email,
            leaseholderIds: emailRecipients.map(r => r.leaseholder_id),
            errors: mergeResult.errors
          });
          continue;
        }
        
        if (testMode) {
          // In test mode, just return the rendered content
          results.push({
            email,
            leaseholderIds: emailRecipients.map(r => r.leaseholder_id),
            subject: mergeResult.subject,
            html: mergeResult.html,
            text: mergeResult.text,
            warnings: mergeResult.warnings
          });
        } else {
          // Send email
          const messageId = await sendEmail({
            to: email,
            subject: mergeResult.subject || template.name,
            html: mergeResult.html,
            text: mergeResult.text,
            from: process.env.FROM_EMAIL || 'noreply@blociq.co.uk'
          });
          
          // Log to communications_log for each recipient
          for (const recipient of emailRecipients) {
            await logCommunication({
              agencyId: profile.agency_id,
              buildingId,
              unitId: recipient.unit_id,
              leaseId: recipient.lease_id,
              leaseholderId: recipient.leaseholder_id,
              type: 'email',
              status: 'sent',
              templateId,
              subject: mergeResult.subject || template.name,
              recipientEmail: email,
              recipientAddress: recipient.postal_address,
              metadata: {
                message_id: messageId,
                fields_used: mergeResult.fields_used,
                fields_missing: mergeResult.fields_missing,
                warnings: mergeResult.warnings,
                joint_recipients: emailRecipients.map(r => r.leaseholder_id)
              },
              userId: user.id
            });
          }
          
          results.push({
            email,
            leaseholderIds: emailRecipients.map(r => r.leaseholder_id),
            messageId,
            warnings: mergeResult.warnings
          });
        }
        
        if (mergeResult.warnings.length > 0) {
          warnings.push({
            email,
            leaseholderIds: emailRecipients.map(r => r.leaseholder_id),
            warnings: mergeResult.warnings
          });
        }
        
      } catch (error) {
        console.error(`Error processing email ${email}:`, error);
        errors.push({
          email,
          leaseholderIds: emailRecipients.map(r => r.leaseholder_id),
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      results: {
        total: emailGroups.size,
        successful: results.length,
        failed: errors.length,
        warnings: warnings.length
      },
      data: results,
      errors,
      warnings,
      testMode
    });
    
  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Group recipients by email address
 */
function groupRecipientsByEmail(recipients: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();
  
  for (const recipient of recipients) {
    const email = recipient.email?.toLowerCase().trim();
    if (!email) continue;
    
    if (!groups.has(email)) {
      groups.set(email, []);
    }
    groups.get(email)!.push(recipient);
  }
  
  return groups;
}

/**
 * Map recipient data from database to merge format
 */
function mapRecipientData(recipient: any): RecipientData {
  return {
    building_name: recipient.building_name,
    building_address_line_1: recipient.address_line_1,
    building_address_line_2: recipient.address_line_2,
    building_town: recipient.town,
    building_county: recipient.county,
    building_postcode: recipient.postcode,
    unit_label: recipient.unit_label,
    unit_number: recipient.unit_number,
    unit_type: recipient.unit_type,
    lease_service_charge_percent: recipient.service_charge_percent,
    lease_start_date: recipient.lease_start_date,
    lease_end_date: recipient.lease_end_date,
    lease_rent_amount: recipient.rent_amount,
    lease_deposit_amount: recipient.deposit_amount,
    lease_type: recipient.lease_type,
    lease_break_clause_date: recipient.break_clause_date,
    lease_renewal_date: recipient.renewal_date,
    lease_insurance_required: recipient.insurance_required,
    lease_pet_clause: recipient.pet_clause,
    lease_subletting_allowed: recipient.subletting_allowed,
    leaseholder_id: recipient.leaseholder_id,
    leaseholder_name: recipient.leaseholder_name,
    salutation: recipient.salutation,
    salutation_fallback: recipient.salutation_fallback,
    postal_address: recipient.postal_address,
    email: recipient.email,
    opt_out_email: recipient.opt_out_email,
    uses_unit_as_postal: recipient.uses_unit_as_postal,
    today: recipient.today
  };
}

/**
 * Send email using configured provider
 */
async function sendEmail(data: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from: string;
}): Promise<string> {
  // This is a placeholder implementation
  // In a real implementation, you would use a service like SendGrid, AWS SES, or Outlook Graph API
  
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('Email would be sent:', {
    to: data.to,
    subject: data.subject,
    from: data.from,
    messageId
  });
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return messageId;
}

/**
 * Log communication to database
 */
async function logCommunication(data: {
  agencyId: string;
  buildingId: string;
  unitId?: string;
  leaseId?: string;
  leaseholderId?: string;
  type: 'letter' | 'email';
  status: 'generated' | 'queued' | 'sent' | 'failed' | 'delivered' | 'bounced';
  templateId: string;
  storagePath?: string;
  subject?: string;
  recipientEmail?: string;
  recipientAddress?: string;
  metadata?: any;
  userId: string;
}): Promise<void> {
  const supabase = getServiceClient();
  
  const { error } = await supabase
    .from('communications_log')
    .insert({
      agency_id: data.agencyId,
      building_id: data.buildingId,
      unit_id: data.unitId,
      lease_id: data.leaseId,
      leaseholder_id: data.leaseholderId,
      type: data.type,
      status: data.status,
      template_id: data.templateId,
      storage_path: data.storagePath,
      subject: data.subject,
      recipient_email: data.recipientEmail,
      recipient_address: data.recipientAddress,
      metadata: data.metadata,
      created_by: data.userId
    });
  
  if (error) {
    console.error('Failed to log communication:', error);
    // Don't throw here as it's not critical
  }
}
