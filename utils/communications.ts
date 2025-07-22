// Utility functions for communication template processing

interface TemplateData {
  [key: string]: string | number | null | undefined;
}

/**
 * Generates a populated template by replacing placeholders with actual data
 * @param templateBody - The template body with placeholders like [placeholder_name]
 * @param data - Object containing the data to replace placeholders
 * @returns The populated template string
 */
export function generatePopulatedTemplate(templateBody: string, data: TemplateData): string {
  let populatedTemplate = templateBody;

  // Replace all placeholders in the format [placeholder_name]
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `[${key}]`;
    const replacement = value?.toString() || '';
    
    // Use global regex to replace all occurrences
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    populatedTemplate = populatedTemplate.replace(regex, replacement);
  });

  return populatedTemplate;
}

/**
 * Extracts all placeholders from a template string
 * @param templateBody - The template body to analyze
 * @returns Array of placeholder names (without brackets)
 */
export function extractPlaceholders(templateBody: string): string[] {
  const placeholderRegex = /\[([^\]]+)\]/g;
  const placeholders: string[] = [];
  let match;

  while ((match = placeholderRegex.exec(templateBody)) !== null) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1]);
    }
  }

  return placeholders;
}

/**
 * Validates that all required placeholders are provided
 * @param templateBody - The template body
 * @param providedData - The data object provided for population
 * @returns Object with validation result and missing placeholders
 */
export function validateTemplateData(templateBody: string, providedData: TemplateData): {
  isValid: boolean;
  missingPlaceholders: string[];
  extraData: string[];
} {
  const requiredPlaceholders = extractPlaceholders(templateBody);
  const providedKeys = Object.keys(providedData);
  
  const missingPlaceholders = requiredPlaceholders.filter(
    placeholder => !providedKeys.includes(placeholder)
  );
  
  const extraData = providedKeys.filter(
    key => !requiredPlaceholders.includes(key)
  );

  return {
    isValid: missingPlaceholders.length === 0,
    missingPlaceholders,
    extraData
  };
}

/**
 * Formats a template for preview with highlighted placeholders
 * @param templateBody - The template body
 * @returns HTML string with highlighted placeholders
 */
export function formatTemplateForPreview(templateBody: string): string {
  return templateBody.replace(
    /\[([^\]]+)\]/g,
    '<span class="bg-yellow-200 px-1 rounded text-yellow-800 font-medium">[$1]</span>'
  );
}

/**
 * Generates sample data for template preview
 * @param placeholders - Array of placeholder names
 * @returns Object with sample data for each placeholder
 */
export function generateSampleData(placeholders: string[]): TemplateData {
  const sampleData: TemplateData = {};
  
  placeholders.forEach(placeholder => {
    switch (placeholder.toLowerCase()) {
      case 'leaseholder_name':
      case 'resident_name':
      case 'tenant_name':
        sampleData[placeholder] = 'John Smith';
        break;
      case 'building_name':
        sampleData[placeholder] = 'Maple Court';
        break;
      case 'building_address':
        sampleData[placeholder] = '123 Main Street, London SW1A 1AA';
        break;
      case 'unit_number':
      case 'flat_number':
        sampleData[placeholder] = 'Flat 5';
        break;
      case 'property_address':
        sampleData[placeholder] = 'Flat 5, Maple Court, 123 Main Street, London SW1A 1AA';
        break;
      case 'date':
        sampleData[placeholder] = new Date().toLocaleDateString('en-GB');
        break;
      case 'manager_name':
        sampleData[placeholder] = 'Sarah Johnson';
        break;
      case 'manager_phone':
        sampleData[placeholder] = '020 7123 4567';
        break;
      case 'manager_email':
        sampleData[placeholder] = 'manager@blociq.com';
        break;
      case 'emergency_contact':
        sampleData[placeholder] = 'Emergency: 0800 123 4567';
        break;
      case 'emergency_phone':
        sampleData[placeholder] = '0800 123 4567';
        break;
      case 'rent_amount':
        sampleData[placeholder] = '£1,200';
        break;
      case 'due_date':
        sampleData[placeholder] = '1st of each month';
        break;
      case 'payment_method':
        sampleData[placeholder] = 'Bank Transfer';
        break;
      case 'payment_reference':
        sampleData[placeholder] = 'MAPLE-123';
        break;
      case 'bank_details':
        sampleData[placeholder] = 'Sort Code: 12-34-56, Account: 12345678';
        break;
      case 'portal_link':
        sampleData[placeholder] = 'https://portal.blociq.com';
        break;
      case 'late_fee_date':
        sampleData[placeholder] = '5th of each month';
        break;
      case 'late_fee_amount':
        sampleData[placeholder] = '£50';
        break;
      case 'maintenance_type':
        sampleData[placeholder] = 'Fire Alarm Testing';
        break;
      case 'maintenance_date':
        sampleData[placeholder] = '15th December 2024';
        break;
      case 'maintenance_time':
        sampleData[placeholder] = '9:00 AM - 12:00 PM';
        break;
      case 'maintenance_duration':
        sampleData[placeholder] = '3 hours';
        break;
      case 'affected_areas':
        sampleData[placeholder] = 'All floors and common areas';
        break;
      case 'work_description':
        sampleData[placeholder] = 'Routine fire alarm system testing and maintenance';
        break;
      case 'noise_level':
        sampleData[placeholder] = 'Low - occasional alarm sounds';
        break;
      case 'access_restrictions':
        sampleData[placeholder] = 'None - normal access maintained';
        break;
      case 'preparation_instructions':
        sampleData[placeholder] = 'No preparation required';
        break;
      case 'complaint_subject':
        sampleData[placeholder] = 'Noise Complaint';
        break;
      case 'complaint_details':
        sampleData[placeholder] = 'Excessive noise from neighbouring flat';
        break;
      case 'response_details':
        sampleData[placeholder] = 'We have investigated and spoken to the neighbour';
        break;
      case 'actions_taken':
        sampleData[placeholder] = 'Warning issued to neighbour, monitoring in place';
        break;
      case 'next_steps':
        sampleData[placeholder] = 'We will monitor the situation and follow up';
        break;
      case 'follow_up_date':
        sampleData[placeholder] = '7 days from today';
        break;
      case 'prevention_measures':
        sampleData[placeholder] = 'Quiet hours policy reminder sent to all residents';
        break;
      case 'assembly_point':
        sampleData[placeholder] = 'Car park at rear of building';
        break;
      case 'training_date':
        sampleData[placeholder] = 'Annual training scheduled for March 2025';
        break;
      case 'lease_start_date':
        sampleData[placeholder] = '1st January 2024';
        break;
      case 'lease_end_date':
        sampleData[placeholder] = '31st December 2024';
        break;
      case 'current_rent':
        sampleData[placeholder] = '£1,200 per month';
        break;
      case 'renewal_rent':
        sampleData[placeholder] = '£1,250 per month';
        break;
      case 'monthly_rent':
        sampleData[placeholder] = '£1,250 per month';
        break;
      case 'notice_period':
        sampleData[placeholder] = '2 months';
        break;
      case 'final_date':
        sampleData[placeholder] = '31st January 2025';
        break;
      case 'inspection_date':
        sampleData[placeholder] = '15th January 2025';
        break;
      case 'response_deadline':
        sampleData[placeholder] = '15th December 2024';
        break;
      case 'renewal_start_date':
        sampleData[placeholder] = '1st February 2025';
        break;
      default:
        sampleData[placeholder] = `[${placeholder}]`;
    }
  });

  return sampleData;
}

/**
 * Sanitizes template content for safe HTML rendering
 * @param content - The template content to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeTemplateContent(content: string): string {
  // Basic HTML sanitization - in production, use a proper sanitization library
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
} 