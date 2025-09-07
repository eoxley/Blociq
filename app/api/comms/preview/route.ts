/**
 * Preview API
 * Generates preview of communications for testing
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
    
    const { buildingId, templateId } = await req.json();
    
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
    
    const previewData = [];
    
    // Generate preview for first 3 lease groups
    const leaseGroups = Array.from(recipientsByLease.entries()).slice(0, 3);
    
    for (const [leaseId, leaseRecipients] of leaseGroups) {
      const primaryRecipient = leaseRecipients[0];
      const recipientData = mapRecipientData(primaryRecipient);
      
      // Render template
      const mergeResult = renderTemplate(template, recipientData);
      
      previewData.push({
        recipient: {
          leaseholder_id: primaryRecipient.leaseholder_id,
          leaseholder_name: primaryRecipient.leaseholder_name,
          salutation: primaryRecipient.salutation || primaryRecipient.salutation_fallback,
          email: primaryRecipient.email,
          postal_address: primaryRecipient.postal_address,
          unit_label: primaryRecipient.unit_label,
          opt_out_email: primaryRecipient.opt_out_email
        },
        subject: mergeResult.subject,
        html: mergeResult.html,
        text: mergeResult.text,
        warnings: mergeResult.warnings,
        errors: mergeResult.errors
      });
    }
    
    return NextResponse.json({
      success: true,
      preview: previewData,
      total: recipientsByLease.size,
      template: {
        id: template.id,
        name: template.name,
        type: template.type
      }
    });
    
  } catch (error) {
    console.error('Preview error:', error);
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
