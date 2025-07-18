import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export async function replacePlaceholdersInDocx(buffer: Blob, data: Record<string, string>): Promise<Blob> {
  try {
    console.log("🔧 Starting placeholder replacement...");
    
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await buffer.arrayBuffer();
    
    // Create PizZip instance
    const zip = new PizZip(arrayBuffer);
    
    // Create Docxtemplater instance with options
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '' // Return empty string for missing placeholders
    });
    
    // Set the data for replacement
    doc.setData(data);
    
    // Render the document (replace placeholders)
    doc.render();
    
    // Generate the output
    const output = doc.getZip().generate({ 
      type: 'uint8array',
      compression: 'DEFLATE'
    });
    
    // Convert back to Blob
    const result = new Blob([output], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    
    console.log("✅ Placeholder replacement completed");
    return result;
    
  } catch (error) {
    console.error("❌ Error in placeholder replacement:", error);
    
    // If there's an error with docxtemplater, it might be due to malformed template
    if (error instanceof Error) {
      if (error.message.includes('Unclosed tag')) {
        throw new Error('Template contains unclosed placeholder tags. Please check your template format.');
      }
      if (error.message.includes('Unopened tag')) {
        throw new Error('Template contains unopened placeholder tags. Please check your template format.');
      }
    }
    
    throw new Error('Failed to process document template. Please ensure the template is valid.');
  }
}

// Helper function to extract placeholders from a template
export async function extractPlaceholdersFromTemplate(buffer: Blob): Promise<string[]> {
  try {
    const arrayBuffer = await buffer.arrayBuffer();
    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip);
    
    // Get all placeholders from the template
    const placeholders = doc.getFullText().match(/\{\{([^}]+)\}\}/g) || [];
    
    // Clean up placeholders (remove {{ }} and return unique values)
    const cleanPlaceholders = [...new Set(
      placeholders.map(p => p.replace(/\{\{|\}\}/g, '').trim())
    )];
    
    return cleanPlaceholders;
  } catch (error) {
    console.error("Error extracting placeholders:", error);
    return [];
  }
}

// Helper function to validate placeholder data
export function validatePlaceholderData(data: Record<string, string>, requiredFields: string[]): {
  isValid: boolean;
  missingFields: string[];
} {
  const missingFields = requiredFields.filter(field => !data[field] || data[field].trim() === '');
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

// Common placeholder mappings for different document types
export const commonPlaceholders = {
  welcome_letter: [
    'building_name',
    'leaseholder_name',
    'unit_number',
    'property_manager_name',
    'today_date',
    'contact_email',
    'contact_phone'
  ],
  notice: [
    'building_name',
    'leaseholder_name',
    'unit_number',
    'notice_type',
    'notice_period',
    'today_date',
    'property_manager_name'
  ],
  form: [
    'building_name',
    'form_type',
    'today_date',
    'property_manager_name',
    'contact_email'
  ],
  invoice: [
    'building_name',
    'leaseholder_name',
    'unit_number',
    'service_charge_amount',
    'due_date',
    'today_date',
    'invoice_number'
  ]
}; 