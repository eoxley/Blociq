/**
 * Mail-Merge Engine
 * Renders templates with recipient data and handles field resolution
 */

import { CommunicationTemplate } from './templates';

export interface RecipientData {
  // Building fields
  building_name: string;
  building_address_line_1: string;
  building_address_line_2?: string;
  building_town: string;
  building_county?: string;
  building_postcode: string;
  
  // Unit fields
  unit_label: string;
  unit_number?: string;
  unit_type?: string;
  
  // Lease fields
  lease_service_charge_percent?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  lease_rent_amount?: number;
  lease_deposit_amount?: number;
  lease_type?: string;
  lease_break_clause_date?: string;
  lease_renewal_date?: string;
  lease_insurance_required?: boolean;
  lease_pet_clause?: string;
  lease_subletting_allowed?: boolean;
  
  // Recipient fields
  leaseholder_id: string;
  leaseholder_name: string;
  salutation: string;
  salutation_fallback: string;
  postal_address?: string;
  email?: string;
  opt_out_email?: boolean;
  uses_unit_as_postal: boolean;
  
  // System fields
  today: string;
}

export interface MergeResult {
  html: string;
  text?: string;
  subject?: string;
  errors: string[];
  warnings: string[];
  fields_used: string[];
  fields_missing: string[];
}

export interface MergeContext {
  building: {
    name: string;
    address_line_1: string;
    address_line_2?: string;
    town: string;
    county?: string;
    postcode: string;
  };
  unit: {
    label: string;
    number?: string;
    type?: string;
  };
  lease: {
    service_charge_percent?: number;
    start_date?: string;
    end_date?: string;
    rent_amount?: number;
    deposit_amount?: number;
    type?: string;
    break_clause_date?: string;
    renewal_date?: string;
    insurance_required?: boolean;
    pet_clause?: string;
    subletting_allowed?: boolean;
  };
  recipient: {
    name: string;
    salutation: string;
    postal_address?: string;
    email?: string;
    uses_unit_as_postal: boolean;
  };
  today: string;
}

/**
 * Render a template with recipient data
 */
export function renderTemplate(
  template: CommunicationTemplate,
  recipientData: RecipientData
): MergeResult {
  const context = buildMergeContext(recipientData);
  const errors: string[] = [];
  const warnings: string[] = [];
  const fieldsUsed: string[] = [];
  const fieldsMissing: string[] = [];
  
  // Render HTML content
  const htmlResult = renderContent(template.body_html, context, fieldsUsed, fieldsMissing);
  
  // Render text content if available
  let textResult: string | undefined;
  if (template.body_text) {
    textResult = renderContent(template.body_text, context, fieldsUsed, fieldsMissing);
  }
  
  // Render subject for emails
  let subjectResult: string | undefined;
  if (template.type === 'email' && template.subject) {
    subjectResult = renderContent(template.subject, context, fieldsUsed, fieldsMissing);
  }
  
  // Check for missing required fields
  const requiredFields = template.required_fields || [];
  const missingRequired = requiredFields.filter(field => fieldsMissing.includes(field));
  
  if (missingRequired.length > 0) {
    errors.push(`Missing required fields: ${missingRequired.join(', ')}`);
  }
  
  // Check for opt-out email
  if (template.type === 'email' && recipientData.opt_out_email) {
    warnings.push('Recipient has opted out of emails');
  }
  
  // Check for missing email
  if (template.type === 'email' && !recipientData.email) {
    errors.push('No email address available for recipient');
  }
  
  return {
    html: htmlResult,
    text: textResult,
    subject: subjectResult,
    errors,
    warnings,
    fields_used: fieldsUsed,
    fields_missing: fieldsMissing
  };
}

/**
 * Build merge context from recipient data
 */
function buildMergeContext(recipientData: RecipientData): MergeContext {
  return {
    building: {
      name: recipientData.building_name,
      address_line_1: recipientData.building_address_line_1,
      address_line_2: recipientData.building_address_line_2,
      town: recipientData.building_town,
      county: recipientData.building_county,
      postcode: recipientData.building_postcode
    },
    unit: {
      label: recipientData.unit_label,
      number: recipientData.unit_number,
      type: recipientData.unit_type
    },
    lease: {
      service_charge_percent: recipientData.lease_service_charge_percent,
      start_date: recipientData.lease_start_date,
      end_date: recipientData.lease_end_date,
      rent_amount: recipientData.lease_rent_amount,
      deposit_amount: recipientData.lease_deposit_amount,
      type: recipientData.lease_type,
      break_clause_date: recipientData.lease_break_clause_date,
      renewal_date: recipientData.lease_renewal_date,
      insurance_required: recipientData.lease_insurance_required,
      pet_clause: recipientData.lease_pet_clause,
      subletting_allowed: recipientData.lease_subletting_allowed
    },
    recipient: {
      name: recipientData.leaseholder_name,
      salutation: recipientData.salutation || recipientData.salutation_fallback,
      postal_address: recipientData.postal_address,
      email: recipientData.email,
      uses_unit_as_postal: recipientData.uses_unit_as_postal
    },
    today: recipientData.today
  };
}

/**
 * Render content with merge fields
 */
function renderContent(
  content: string,
  context: MergeContext,
  fieldsUsed: string[],
  fieldsMissing: string[]
): string {
  let result = content;
  
  // Find all merge fields
  const mergeFields = content.match(/\{\{([^}]+)\}\}/g) || [];
  
  for (const field of mergeFields) {
    const fieldName = field.replace(/\{\{|\}\}/g, '').trim();
    const value = resolveField(fieldName, context);
    
    if (value !== null) {
      result = result.replace(field, value);
      if (!fieldsUsed.includes(fieldName)) {
        fieldsUsed.push(fieldName);
      }
    } else {
      result = result.replace(field, `[MISSING: ${fieldName}]`);
      if (!fieldsMissing.includes(fieldName)) {
        fieldsMissing.push(fieldName);
      }
    }
  }
  
  return result;
}

/**
 * Resolve a field value from context
 */
function resolveField(fieldName: string, context: MergeContext): string | null {
  const parts = fieldName.split('.');
  if (parts.length !== 2) {
    return null;
  }
  
  const [namespace, field] = parts;
  
  try {
    switch (namespace) {
      case 'building':
        return resolveBuildingField(field, context.building);
      case 'unit':
        return resolveUnitField(field, context.unit);
      case 'lease':
        return resolveLeaseField(field, context.lease);
      case 'recipient':
        return resolveRecipientField(field, context.recipient);
      case 'today':
        return context.today;
      default:
        return null;
    }
  } catch (error) {
    console.warn(`Error resolving field ${fieldName}:`, error);
    return null;
  }
}

/**
 * Resolve building fields
 */
function resolveBuildingField(field: string, building: MergeContext['building']): string | null {
  switch (field) {
    case 'name':
      return building.name || null;
    case 'address_line_1':
      return building.address_line_1 || null;
    case 'address_line_2':
      return building.address_line_2 || null;
    case 'town':
      return building.town || null;
    case 'county':
      return building.county || null;
    case 'postcode':
      return building.postcode || null;
    default:
      return null;
  }
}

/**
 * Resolve unit fields
 */
function resolveUnitField(field: string, unit: MergeContext['unit']): string | null {
  switch (field) {
    case 'label':
      return unit.label || null;
    case 'number':
      return unit.number || null;
    case 'type':
      return unit.type || null;
    default:
      return null;
  }
}

/**
 * Resolve lease fields
 */
function resolveLeaseField(field: string, lease: MergeContext['lease']): string | null {
  switch (field) {
    case 'service_charge_percent':
      return lease.service_charge_percent?.toString() || null;
    case 'start_date':
      return lease.start_date || null;
    case 'end_date':
      return lease.end_date || null;
    case 'rent_amount':
      return lease.rent_amount?.toString() || null;
    case 'deposit_amount':
      return lease.deposit_amount?.toString() || null;
    case 'type':
      return lease.type || null;
    case 'break_clause_date':
      return lease.break_clause_date || null;
    case 'renewal_date':
      return lease.renewal_date || null;
    case 'insurance_required':
      return lease.insurance_required ? 'Yes' : 'No';
    case 'pet_clause':
      return lease.pet_clause || null;
    case 'subletting_allowed':
      return lease.subletting_allowed ? 'Yes' : 'No';
    default:
      return null;
  }
}

/**
 * Resolve recipient fields
 */
function resolveRecipientField(field: string, recipient: MergeContext['recipient']): string | null {
  switch (field) {
    case 'name':
      return recipient.name || null;
    case 'salutation':
      return recipient.salutation || null;
    case 'postal_address':
      return recipient.postal_address || null;
    case 'email':
      return recipient.email || null;
    case 'uses_unit_as_postal':
      return recipient.uses_unit_as_postal ? 'true' : 'false';
    default:
      return null;
  }
}

/**
 * Validate recipient data for template
 */
export function validateRecipientData(
  recipientData: RecipientData,
  template: CommunicationTemplate
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required fields
  const requiredFields = template.required_fields || [];
  
  for (const field of requiredFields) {
    const value = resolveField(field, buildMergeContext(recipientData));
    if (!value || value === '[MISSING: ' + field + ']') {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Check email-specific requirements
  if (template.type === 'email') {
    if (!recipientData.email) {
      errors.push('Email address required for email template');
    }
    
    if (recipientData.opt_out_email) {
      warnings.push('Recipient has opted out of emails');
    }
  }
  
  // Check for missing postal address
  if (!recipientData.postal_address) {
    warnings.push('No postal address available');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get field usage statistics
 */
export function getFieldUsageStats(
  templates: CommunicationTemplate[]
): Record<string, number> {
  const stats: Record<string, number> = {};
  
  for (const template of templates) {
    const fields = template.required_fields || [];
    for (const field of fields) {
      stats[field] = (stats[field] || 0) + 1;
    }
  }
  
  return stats;
}

/**
 * Preview template with sample data
 */
export function previewTemplate(
  template: CommunicationTemplate,
  sampleData?: Partial<RecipientData>
): MergeResult {
  const defaultData: RecipientData = {
    building_name: 'Sample Building',
    building_address_line_1: '123 Sample Street',
    building_town: 'Sample Town',
    building_postcode: 'SW1A 1AA',
    unit_label: 'Flat 1',
    leaseholder_id: 'sample-id',
    leaseholder_name: 'John Smith',
    salutation: 'Mr John Smith',
    salutation_fallback: 'Mr John Smith',
    postal_address: '123 Sample Street, Sample Town, SW1A 1AA',
    email: 'john.smith@example.com',
    uses_unit_as_postal: false,
    today: new Date().toLocaleDateString('en-GB')
  };
  
  const recipientData = { ...defaultData, ...sampleData };
  return renderTemplate(template, recipientData);
}
