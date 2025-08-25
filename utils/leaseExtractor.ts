// Lease Document Extractor Utility
// Automatically extracts key lease clauses from PDF text

export const keyTerms = [
  "Term", "Consent", "Reserve fund", "Windows", "Pipes", "Heating", "Parking",
  "Right of Access", "TV", "Assignment", "Alterations", "Notice", "Sublet",
  "Pets", "Debt recovery", "Interest", "Exterior redecorations", "Interior Redecorations"
];

export interface LeaseClause {
  term: string;
  text: string;
  found: boolean;
  page?: number;
}

export interface LeaseExtractionResult {
  isLease: boolean;
  confidence: number;
  clauses: Record<string, LeaseClause>;
  summary?: string;
  metadata: {
    totalPages: number;
    extractedTextLength: number;
    keyTermsFound: number;
    extractionTimestamp: string;
  };
}

/**
 * Extract lease clauses from text using regex patterns
 * Returns Record<string, string> as specified in the user's implementation
 */
export function extractLeaseClauses(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const term of keyTerms) {
    // Create regex pattern to find term with surrounding context
    // Look for 0-50 chars before, term, then 0-300 chars after
    const regex = new RegExp(`.{0,50}${term}.{0,300}`, 'i');
    
    const match = text.match(regex);
    
    if (match && match[0]) {
      // Clean up the extracted text
      let cleanText = match[0].trim();
      
      // Try to find sentence boundaries
      const sentences = cleanText.split(/[.!?]+/);
      if (sentences.length > 1) {
        // Take the first complete sentence that contains the term
        cleanText = sentences.find(s => s.toLowerCase().includes(term.toLowerCase())) || cleanText;
      }
      
      result[term] = cleanText;
    } else {
      result[term] = "❌ Not found";
    }
  }
  
  return result;
}

/**
 * Enhanced version that returns structured LeaseClause objects
 */
export function extractLeaseClausesEnhanced(text: string): Record<string, LeaseClause> {
  const result: Record<string, LeaseClause> = {};
  
  for (const term of keyTerms) {
    // Create regex pattern to find term with surrounding context
    const regex = new RegExp(`.{0,50}${term}.{0,300}`, 'i');
    
    const match = text.match(regex);
    
    if (match && match[0]) {
      // Clean up the extracted text
      let cleanText = match[0].trim();
      
      // Try to find sentence boundaries
      const sentences = cleanText.split(/[.!?]+/);
      if (sentences.length > 1) {
        // Take the first complete sentence that contains the term
        cleanText = sentences.find(s => s.toLowerCase().includes(term.toLowerCase())) || cleanText;
      }
      
      result[term.toLowerCase().replace(/\s+/g, '_')] = {
        term,
        text: cleanText,
        found: true
      };
    } else {
      result[term.toLowerCase().replace(/\s+/g, '_')] = {
        term,
        text: "❌ Clause not found in document",
        found: false
      };
    }
  }
  
  return result;
}

/**
 * Detect if a document is likely a lease based on filename and content
 */
export function isLeaseDocument(fileName: string, text: string): boolean {
  const lowerFileName = fileName.toLowerCase();
  const lowerText = text.toLowerCase();
  
  // Check filename patterns
  const leaseFileNamePatterns = [
    'lease',
    'tenancy',
    'agreement',
    'contract',
    'deed'
  ];
  
  const hasLeaseFileName = leaseFileNamePatterns.some(pattern => 
    lowerFileName.includes(pattern)
  );
  
  // Check content patterns
  const leaseContentPatterns = [
    'this lease is dated',
    'lease dated',
    'landlord and tenant',
    'term of years',
    'demise unto',
    'rent and service charge',
    'covenants by the tenant',
    'covenants by the landlord',
    'schedule of conditions'
  ];
  
  const hasLeaseContent = leaseContentPatterns.some(pattern => 
    lowerText.includes(pattern)
  );
  
  // Calculate confidence score
  let confidence = 0;
  if (hasLeaseFileName) confidence += 0.4;
  if (hasLeaseContent) confidence += 0.6;
  
  return confidence >= 0.5;
}

/**
 * Generate a structured summary of extracted lease clauses
 */
export function generateLeaseSummary(clauses: Record<string, LeaseClause>): string {
  const foundClauses = Object.values(clauses).filter(clause => clause.found);
  const missingClauses = Object.values(clauses).filter(clause => !clause.found);
  
  let summary = `📋 **Lease Document Analysis**\n\n`;
  
  if (foundClauses.length > 0) {
    summary += `✅ **Key Clauses Found (${foundClauses.length}):**\n`;
    foundClauses.forEach(clause => {
      summary += `• **${clause.term}**: ${clause.text.substring(0, 100)}${clause.text.length > 100 ? '...' : ''}\n`;
    });
    summary += '\n';
  }
  
  if (missingClauses.length > 0) {
    summary += `⚠️ **Missing Clauses (${missingClauses.length}):**\n`;
    missingClauses.forEach(clause => {
      summary += `• ${clause.term}\n`;
    });
    summary += '\n';
  }
  
  summary += `📊 **Coverage**: ${Math.round((foundClauses.length / keyTerms.length) * 100)}% of key terms found`;
  
  return summary;
}

/**
 * Validate and clean extracted text
 */
export function cleanExtractedText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s.,!?;:()\-]/g, '') // Remove special characters
    .trim();
}

/**
 * Get lease document type classification
 */
export function classifyLeaseDocument(clauses: Record<string, LeaseClause>): string {
  const foundClauses = Object.values(clauses).filter(clause => clause.found);
  
  if (foundClauses.length >= 15) {
    return 'Full Lease Agreement';
  } else if (foundClauses.length >= 10) {
    return 'Standard Lease';
  } else if (foundClauses.length >= 5) {
    return 'Lease Summary or Extract';
  } else {
    return 'Possibly Related Document';
  }
}
