/**
 * Word CSV Export API
 * Exports recipient data as CSV for Microsoft Word Mail Merge
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/server';
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
    
    if (!buildingId) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        message: 'buildingId is required'
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
    
    // Generate CSV content
    const csvContent = generateWordCSV(recipientsByLease);
    
    // Save to storage
    const storagePath = await saveCSVToStorage(
      csvContent,
      buildingId,
      templateId,
      profile.agency_id
    );
    
    // Generate signed URL
    const signedUrl = await generateSignedUrl(storagePath);
    
    // Log the export
    await logCommunication({
      agencyId: profile.agency_id,
      buildingId,
      type: 'letter',
      status: 'generated',
      templateId,
      storagePath,
      subject: 'Word CSV Export',
      metadata: {
        export_type: 'word_csv',
        recipient_count: recipientsByLease.size,
        fields_included: getCSVFields()
      },
      userId: user.id
    });
    
    return NextResponse.json({
      success: true,
      downloadUrl: signedUrl,
      filename: `word_merge_${buildingId}_${new Date().toISOString().split('T')[0]}.csv`,
      recipientCount: recipientsByLease.size,
      fields: getCSVFields()
    });
    
  } catch (error) {
    console.error('Word CSV export error:', error);
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
 * Generate CSV content optimized for Word Mail Merge
 */
function generateWordCSV(recipientsByLease: Map<string, any[]>): string {
  const fields = getCSVFields();
  const rows: string[] = [];
  
  // Add header row
  rows.push(fields.map(field => escapeCSV(field)).join(','));
  
  // Add data rows
  for (const [leaseId, leaseRecipients] of recipientsByLease) {
    const primaryRecipient = leaseRecipients[0];
    const row = generateCSVRow(primaryRecipient, leaseRecipients);
    rows.push(row);
  }
  
  return rows.join('\n');
}

/**
 * Get CSV field names
 */
function getCSVFields(): string[] {
  return [
    'Salutation',
    'FirstName',
    'LastName',
    'FullName',
    'AddressLine1',
    'AddressLine2',
    'AddressLine3',
    'AddressLine4',
    'Postcode',
    'Email',
    'UnitLabel',
    'UnitNumber',
    'UnitType',
    'BuildingName',
    'BuildingAddress1',
    'BuildingAddress2',
    'BuildingTown',
    'BuildingCounty',
    'BuildingPostcode',
    'LeaseStartDate',
    'LeaseEndDate',
    'ServiceChargePercent',
    'RentAmount',
    'DepositAmount',
    'LeaseType',
    'Today',
    'UsesUnitAsPostal',
    'LeaseholderCount',
    'JointLeaseholders'
  ];
}

/**
 * Generate CSV row for a lease group
 */
function generateCSVRow(primaryRecipient: any, allRecipients: any[]): string {
  const fields = getCSVFields();
  const values: string[] = [];
  
  // Salutation
  values.push(primaryRecipient.salutation || primaryRecipient.salutation_fallback || '');
  
  // Name fields
  const fullName = primaryRecipient.leaseholder_name || '';
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  values.push(firstName);
  values.push(lastName);
  values.push(fullName);
  
  // Address fields
  const address = primaryRecipient.postal_address || '';
  const addressLines = address.split(',').map(line => line.trim());
  
  values.push(addressLines[0] || ''); // AddressLine1
  values.push(addressLines[1] || ''); // AddressLine2
  values.push(addressLines[2] || ''); // AddressLine3
  values.push(addressLines[3] || ''); // AddressLine4
  values.push(primaryRecipient.postcode || ''); // Postcode
  
  // Email
  values.push(primaryRecipient.email || '');
  
  // Unit fields
  values.push(primaryRecipient.unit_label || '');
  values.push(primaryRecipient.unit_number || '');
  values.push(primaryRecipient.unit_type || '');
  
  // Building fields
  values.push(primaryRecipient.building_name || '');
  values.push(primaryRecipient.address_line_1 || '');
  values.push(primaryRecipient.address_line_2 || '');
  values.push(primaryRecipient.town || '');
  values.push(primaryRecipient.county || '');
  values.push(primaryRecipient.postcode || '');
  
  // Lease fields
  values.push(primaryRecipient.lease_start_date || '');
  values.push(primaryRecipient.lease_end_date || '');
  values.push(primaryRecipient.service_charge_percent?.toString() || '');
  values.push(primaryRecipient.rent_amount?.toString() || '');
  values.push(primaryRecipient.deposit_amount?.toString() || '');
  values.push(primaryRecipient.lease_type || '');
  
  // System fields
  values.push(primaryRecipient.today || '');
  values.push(primaryRecipient.uses_unit_as_postal ? 'Yes' : 'No');
  
  // Joint leaseholder fields
  values.push(allRecipients.length.toString());
  values.push(allRecipients.map(r => r.leaseholder_name).join(', '));
  
  return values.map(value => escapeCSV(value)).join(',');
}

/**
 * Escape CSV value
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // If the value contains comma, newline, or quote, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Save CSV to Supabase Storage
 */
async function saveCSVToStorage(
  csvContent: string,
  buildingId: string,
  templateId: string | undefined,
  agencyId: string
): Promise<string> {
  const supabase = getServiceClient();
  
  const date = new Date().toISOString().split('T')[0];
  const filename = `word_merge_${buildingId}_${date}.csv`;
  const storagePath = `exports/word_csv/${agencyId}/${date}/${filename}`;
  
  const { error } = await supabase.storage
    .from('communications')
    .upload(storagePath, csvContent, {
      contentType: 'text/csv',
      cacheControl: '3600'
    });
  
  if (error) {
    throw new Error(`Failed to save CSV: ${error.message}`);
  }
  
  return storagePath;
}

/**
 * Generate signed URL for download
 */
async function generateSignedUrl(storagePath: string): Promise<string> {
  const supabase = getServiceClient();
  
  const { data, error } = await supabase.storage
    .from('communications')
    .createSignedUrl(storagePath, 3600); // 1 hour expiry
  
  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
  
  return data.signedUrl;
}

/**
 * Log communication to database
 */
async function logCommunication(data: {
  agencyId: string;
  buildingId: string;
  type: 'letter' | 'email';
  status: 'generated' | 'queued' | 'sent' | 'failed' | 'delivered' | 'bounced';
  templateId?: string;
  storagePath: string;
  subject: string;
  metadata?: any;
  userId: string;
}): Promise<void> {
  const supabase = getServiceClient();
  
  const { error } = await supabase
    .from('communications_log')
    .insert({
      agency_id: data.agencyId,
      building_id: data.buildingId,
      type: data.type,
      status: data.status,
      template_id: data.templateId,
      storage_path: data.storagePath,
      subject: data.subject,
      metadata: data.metadata,
      created_by: data.userId
    });
  
  if (error) {
    console.error('Failed to log communication:', error);
    // Don't throw here as it's not critical
  }
}
