/**
 * Batch Letter Generator API
 * Generates PDF letters for building recipients using mail-merge
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
    
    const { buildingId, templateId, testMode = false } = await req.json();
    
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
    
    if (template.type !== 'letter') {
      return NextResponse.json({ 
        error: 'Invalid template type',
        message: 'Template must be a letter template'
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
    
    // Group recipients by lease for joint letters
    const recipientsByLease = groupRecipientsByLease(recipients);
    
    const results = [];
    const errors = [];
    const warnings = [];
    
    // Process each lease group
    for (const [leaseId, leaseRecipients] of recipientsByLease) {
      try {
        // Use the first recipient as the primary recipient
        const primaryRecipient = leaseRecipients[0];
        const recipientData = mapRecipientData(primaryRecipient);
        
        // Render template
        const mergeResult = renderTemplate(template, recipientData);
        
        if (mergeResult.errors.length > 0) {
          errors.push({
            leaseId,
            leaseholderId: primaryRecipient.leaseholder_id,
            errors: mergeResult.errors
          });
          continue;
        }
        
        if (testMode) {
          // In test mode, just return the rendered content
          results.push({
            leaseId,
            leaseholderId: primaryRecipient.leaseholder_id,
            html: mergeResult.html,
            text: mergeResult.text,
            warnings: mergeResult.warnings
          });
        } else {
          // Generate PDF
          const pdfBuffer = await generatePDF(mergeResult.html, template.name);
          
          // Save to storage
          const storagePath = await savePDFToStorage(
            pdfBuffer,
            buildingId,
            leaseId,
            primaryRecipient.leaseholder_id,
            template.name
          );
          
          // Log to communications_log
          await logCommunication({
            agencyId: profile.agency_id,
            buildingId,
            unitId: primaryRecipient.unit_id,
            leaseId,
            leaseholderId: primaryRecipient.leaseholder_id,
            type: 'letter',
            status: 'generated',
            templateId,
            storagePath,
            subject: template.name,
            recipientEmail: primaryRecipient.email,
            recipientAddress: primaryRecipient.postal_address,
            metadata: {
              fields_used: mergeResult.fields_used,
              fields_missing: mergeResult.fields_missing,
              warnings: mergeResult.warnings,
              joint_leaseholders: leaseRecipients.map(r => r.leaseholder_id)
            },
            userId: user.id
          });
          
          results.push({
            leaseId,
            leaseholderId: primaryRecipient.leaseholder_id,
            storagePath,
            warnings: mergeResult.warnings
          });
        }
        
        if (mergeResult.warnings.length > 0) {
          warnings.push({
            leaseId,
            leaseholderId: primaryRecipient.leaseholder_id,
            warnings: mergeResult.warnings
          });
        }
        
      } catch (error) {
        console.error(`Error processing lease ${leaseId}:`, error);
        errors.push({
          leaseId,
          leaseholderId: leaseRecipients[0].leaseholder_id,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }
    
    // Generate ZIP file if not in test mode
    let zipUrl = null;
    if (!testMode && results.length > 0) {
      zipUrl = await generateZipFile(buildingId, results);
    }
    
    return NextResponse.json({
      success: true,
      results: {
        total: recipientsByLease.size,
        successful: results.length,
        failed: errors.length,
        warnings: warnings.length
      },
      data: results,
      errors,
      warnings,
      zipUrl,
      testMode
    });
    
  } catch (error) {
    console.error('Letter generation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Group recipients by lease for joint letters
 */
function groupRecipientsByLease(recipients: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();
  
  for (const recipient of recipients) {
    const leaseId = recipient.lease_id;
    if (!groups.has(leaseId)) {
      groups.set(leaseId, []);
    }
    groups.get(leaseId)!.push(recipient);
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
 * Generate PDF from HTML content
 */
async function generatePDF(html: string, title: string): Promise<Buffer> {
  // This is a placeholder implementation
  // In a real implementation, you would use a PDF generation library like puppeteer
  // For now, return a simple HTML buffer
  
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .footer { border-top: 2px solid #333; padding-top: 20px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>BlocIQ Management</h1>
      </div>
      <div class="content">
        ${html}
      </div>
      <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString('en-GB')}</p>
      </div>
    </body>
    </html>
  `;
  
  return Buffer.from(fullHtml, 'utf-8');
}

/**
 * Save PDF to Supabase Storage
 */
async function savePDFToStorage(
  pdfBuffer: Buffer,
  buildingId: string,
  leaseId: string,
  leaseholderId: string,
  templateName: string
): Promise<string> {
  const supabase = getServiceClient();
  
  const date = new Date().toISOString().split('T')[0];
  const filename = `${templateName.replace(/[^a-zA-Z0-9]/g, '_')}_${leaseholderId}.pdf`;
  const storagePath = `letters/${buildingId}/${date}/${filename}`;
  
  const { error } = await supabase.storage
    .from('communications')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      cacheControl: '3600'
    });
  
  if (error) {
    throw new Error(`Failed to save PDF: ${error.message}`);
  }
  
  return storagePath;
}

/**
 * Generate ZIP file of all PDFs
 */
async function generateZipFile(buildingId: string, results: any[]): Promise<string> {
  // This is a placeholder implementation
  // In a real implementation, you would use a ZIP library like archiver
  // For now, return a placeholder URL
  
  return `/api/comms/download-letters/${buildingId}/${Date.now()}`;
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
