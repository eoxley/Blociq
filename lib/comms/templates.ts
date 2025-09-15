/**
 * Communication Templates System
 * Manages templates for letters and emails with merge field support
 */

import { createClient } from '@/lib/supabase/server';

export interface CommunicationTemplate {
  id: string;
  agency_id: string;
  name: string;
  description?: string;
  type: 'letter' | 'email';
  subject?: string; // For emails
  body_html: string;
  body_text?: string;
  required_fields: string[];
  is_active: boolean;
  created_at: string;
  created_by?: string;
  updated_at: string;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  type: 'letter' | 'email';
  subject?: string;
  body_html: string;
  body_text?: string;
  required_fields?: string[];
}

export interface UpdateTemplateData {
  name?: string;
  description?: string;
  subject?: string;
  body_html?: string;
  body_text?: string;
  required_fields?: string[];
  is_active?: boolean;
}

/**
 * Get all templates for an agency
 */
export async function getTemplates(agencyId: string, type?: 'letter' | 'email'): Promise<CommunicationTemplate[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('communication_templates')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .order('name');
  
  if (type) {
    query = query.eq('type', type);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch templates: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get a specific template by ID
 */
export async function getTemplate(templateId: string, agencyId: string): Promise<CommunicationTemplate | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('communication_templates')
    .select('*')
    .eq('id', templateId)
    .eq('agency_id', agencyId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Template not found
    }
    throw new Error(`Failed to fetch template: ${error.message}`);
  }
  
  return data;
}

/**
 * Create a new template
 */
export async function createTemplate(
  templateData: CreateTemplateData,
  agencyId: string,
  userId: string
): Promise<CommunicationTemplate> {
  const supabase = await createClient();
  
  // Validate required fields
  const requiredFields = extractRequiredFields(templateData.body_html, templateData.body_text);
  
  const { data, error } = await supabase
    .from('communication_templates')
    .insert({
      ...templateData,
      agency_id: agencyId,
      required_fields: requiredFields,
      created_by: userId
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create template: ${error.message}`);
  }
  
  return data;
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  templateId: string,
  templateData: UpdateTemplateData,
  agencyId: string
): Promise<CommunicationTemplate> {
  const supabase = await createClient();
  
  // If body_html or body_text is being updated, recalculate required fields
  let requiredFields = templateData.required_fields;
  if (templateData.body_html || templateData.body_text) {
    const existingTemplate = await getTemplate(templateId, agencyId);
    if (existingTemplate) {
      const newBodyHtml = templateData.body_html || existingTemplate.body_html;
      const newBodyText = templateData.body_text || existingTemplate.body_text;
      requiredFields = extractRequiredFields(newBodyHtml, newBodyText);
    }
  }
  
  const { data, error } = await supabase
    .from('communication_templates')
    .update({
      ...templateData,
      required_fields: requiredFields,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)
    .eq('agency_id', agencyId)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to update template: ${error.message}`);
  }
  
  return data;
}

/**
 * Delete a template (soft delete by setting is_active = false)
 */
export async function deleteTemplate(templateId: string, agencyId: string): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('communication_templates')
    .update({ is_active: false })
    .eq('id', templateId)
    .eq('agency_id', agencyId);
  
  if (error) {
    throw new Error(`Failed to delete template: ${error.message}`);
  }
}

/**
 * Extract required fields from template content
 */
function extractRequiredFields(bodyHtml: string, bodyText?: string): string[] {
  const fields = new Set<string>();
  
  // Extract fields from HTML content
  const htmlMatches = bodyHtml.match(/\{\{([^}]+)\}\}/g);
  if (htmlMatches) {
    htmlMatches.forEach(match => {
      const field = match.replace(/\{\{|\}\}/g, '').trim();
      fields.add(field);
    });
  }
  
  // Extract fields from text content
  if (bodyText) {
    const textMatches = bodyText.match(/\{\{([^}]+)\}\}/g);
    if (textMatches) {
      textMatches.forEach(match => {
        const field = match.replace(/\{\{|\}\}/g, '').trim();
        fields.add(field);
      });
    }
  }
  
  return Array.from(fields).sort();
}

/**
 * Validate template content
 */
export function validateTemplate(template: CreateTemplateData): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!template.name || template.name.trim().length === 0) {
    errors.push('Template name is required');
  }
  
  if (!template.body_html || template.body_html.trim().length === 0) {
    errors.push('Template body is required');
  }
  
  if (template.type === 'email' && (!template.subject || template.subject.trim().length === 0)) {
    errors.push('Email subject is required for email templates');
  }
  
  // Field validation
  const requiredFields = extractRequiredFields(template.body_html, template.body_text);
  const invalidFields = requiredFields.filter(field => !isValidField(field));
  
  if (invalidFields.length > 0) {
    errors.push(`Invalid merge fields: ${invalidFields.join(', ')}`);
  }
  
  // Warnings
  if (template.type === 'letter' && !template.body_text) {
    warnings.push('Text version not provided - consider adding for accessibility');
  }
  
  if (requiredFields.length === 0) {
    warnings.push('No merge fields detected - template will be identical for all recipients');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check if a field name is valid
 */
function isValidField(field: string): boolean {
  const validFields = [
    // Building fields
    'building.name', 'building.address_line_1', 'building.address_line_2',
    'building.town', 'building.county', 'building.postcode',
    
    // Unit fields
    'unit.label', 'unit.number', 'unit.type',
    
    // Lease fields
    'lease.service_charge_percent', 'lease.start_date', 'lease.end_date',
    'lease.rent_amount', 'lease.deposit_amount', 'lease.type',
    'lease.break_clause_date', 'lease.renewal_date', 'lease.insurance_required',
    'lease.pet_clause', 'lease.subletting_allowed',
    
    // Recipient fields
    'recipient.salutation', 'recipient.name', 'recipient.postal_address',
    'recipient.email', 'recipient.uses_unit_as_postal',
    
    // System fields
    'today'
  ];
  
  return validFields.includes(field);
}

/**
 * Get template statistics
 */
export async function getTemplateStats(agencyId: string): Promise<{
  total: number;
  letters: number;
  emails: number;
  active: number;
  inactive: number;
}> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('communication_templates')
    .select('type, is_active')
    .eq('agency_id', agencyId);
  
  if (error) {
    throw new Error(`Failed to fetch template stats: ${error.message}`);
  }
  
  const stats = {
    total: data.length,
    letters: data.filter(t => t.type === 'letter').length,
    emails: data.filter(t => t.type === 'email').length,
    active: data.filter(t => t.is_active).length,
    inactive: data.filter(t => !t.is_active).length
  };
  
  return stats;
}

/**
 * Clone a template
 */
export async function cloneTemplate(
  templateId: string,
  newName: string,
  agencyId: string,
  userId: string
): Promise<CommunicationTemplate> {
  const originalTemplate = await getTemplate(templateId, agencyId);
  if (!originalTemplate) {
    throw new Error('Template not found');
  }
  
  const cloneData: CreateTemplateData = {
    name: newName,
    description: originalTemplate.description,
    type: originalTemplate.type,
    subject: originalTemplate.subject,
    body_html: originalTemplate.body_html,
    body_text: originalTemplate.body_text,
    required_fields: originalTemplate.required_fields
  };
  
  return createTemplate(cloneData, agencyId, userId);
}
