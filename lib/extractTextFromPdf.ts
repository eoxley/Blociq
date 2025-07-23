import pdfParse from 'pdf-parse';

export interface TextExtractionResult {
  text: string;
  confidence: 'high' | 'medium' | 'low';
  method: 'pdf-parse' | 'ocr' | 'fallback';
  pageCount?: number;
  wordCount?: number;
}

/**
 * Extract text from PDF buffer with intelligent fallback
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<TextExtractionResult> {
  try {
    // Primary method: pdf-parse
    const pdfData = await pdfParse(buffer);
    const extractedText = pdfData.text || '';
    
    // Check if we got substantial text
    if (extractedText.trim().length > 100) {
      return {
        text: extractedText,
        confidence: 'high',
        method: 'pdf-parse',
        pageCount: pdfData.numpages,
        wordCount: extractedText.split(/\s+/).length
      };
    }
    
    // If text is too short, it might be a scanned document
    console.log('⚠️ PDF text extraction yielded limited content, attempting OCR...');
    
    // For now, return the limited text with low confidence
    // In a full implementation, you would integrate with Google Vision API or similar OCR service
    return {
      text: extractedText || 'Document appears to be scanned or image-based. OCR processing recommended.',
      confidence: 'low',
      method: 'pdf-parse',
      pageCount: pdfData.numpages,
      wordCount: extractedText.split(/\s+/).length
    };
    
  } catch (error) {
    console.error('❌ PDF text extraction failed:', error);
    
    // Fallback: return basic document info
    return {
      text: 'Document processing failed. Please ensure the file is a valid PDF and try again.',
      confidence: 'low',
      method: 'fallback',
      wordCount: 0
    };
  }
}

/**
 * Enhanced text extraction with document type detection
 */
export async function extractTextWithAnalysis(buffer: Buffer, fileName: string): Promise<{
  text: string;
  confidence: 'high' | 'medium' | 'low';
  documentType: string;
  keyPhrases: string[];
  summary: string;
}> {
  const extractionResult = await extractTextFromPDF(buffer);
  
  // Detect document type based on filename and content
  const documentType = detectDocumentType(fileName, extractionResult.text);
  
  // Extract key phrases for better analysis
  const keyPhrases = extractKeyPhrases(extractionResult.text);
  
  // Generate basic summary
  const summary = generateBasicSummary(extractionResult.text, documentType);
  
  return {
    text: extractionResult.text,
    confidence: extractionResult.confidence,
    documentType,
    keyPhrases,
    summary
  };
}

/**
 * Detect document type based on filename and content
 */
export function detectDocumentType(fileName: string, text: string): string {
  const name = fileName.toLowerCase();
  const content = text.toLowerCase();
  
  // Check filename patterns first
  if (name.includes('asbestos') || content.includes('asbestos')) return 'Asbestos Survey';
  if (name.includes('eicr') || content.includes('electrical installation condition report')) return 'EICR';
  if (name.includes('fire') || content.includes('fire risk assessment')) return 'Fire Risk Assessment';
  if (name.includes('lease') || content.includes('lease agreement')) return 'Lease Agreement';
  if (name.includes('insurance') || content.includes('insurance certificate')) return 'Insurance Certificate';
  if (name.includes('major works') || content.includes('major works')) return 'Major Works Scope';
  if (name.includes('minutes') || content.includes('agm') || content.includes('annual general meeting')) return 'Minutes/AGM';
  if (name.includes('certificate') || content.includes('certificate')) return 'Certificate';
  if (name.includes('report') || content.includes('report')) return 'Report';
  if (name.includes('inspection') || content.includes('inspection')) return 'Inspection Report';
  
  // Default based on file extension
  if (name.endsWith('.pdf')) return 'PDF Document';
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'Word Document';
  
  return 'General Document';
}

/**
 * Extract key phrases from document text
 */
export function extractKeyPhrases(text: string): string[] {
  const phrases: string[] = [];
  const content = text.toLowerCase();
  
  // Compliance-related phrases
  if (content.includes('compliant') || content.includes('compliance')) phrases.push('Compliance');
  if (content.includes('requires attention') || content.includes('action required')) phrases.push('Action Required');
  if (content.includes('satisfactory') || content.includes('pass')) phrases.push('Satisfactory');
  if (content.includes('unsatisfactory') || content.includes('fail')) phrases.push('Unsatisfactory');
  
  // Safety-related phrases
  if (content.includes('safety') || content.includes('risk')) phrases.push('Safety/Risk');
  if (content.includes('emergency') || content.includes('evacuation')) phrases.push('Emergency');
  if (content.includes('fire') || content.includes('smoke')) phrases.push('Fire Safety');
  
  // Financial phrases
  if (content.includes('cost') || content.includes('£') || content.includes('payment')) phrases.push('Financial');
  if (content.includes('budget') || content.includes('estimate')) phrases.push('Budget/Estimate');
  
  // Legal phrases
  if (content.includes('legal') || content.includes('regulation') || content.includes('act')) phrases.push('Legal/Regulatory');
  if (content.includes('duty') || content.includes('responsibility')) phrases.push('Duty/Responsibility');
  
  return [...new Set(phrases)]; // Remove duplicates
}

/**
 * Generate basic summary based on document type and content
 */
export function generateBasicSummary(text: string, documentType: string): string {
  const content = text.toLowerCase();
  
  // Document type-specific summaries
  switch (documentType) {
    case 'Asbestos Survey':
      if (content.includes('no asbestos') || content.includes('no acm')) {
        return 'No asbestos-containing materials detected. Building is currently asbestos-clear.';
      } else if (content.includes('asbestos found') || content.includes('acm')) {
        return 'Asbestos-containing materials identified. Management plan required.';
      }
      break;
      
    case 'EICR':
      if (content.includes('c1') || content.includes('danger present')) {
        return 'Urgent electrical safety issues identified. Immediate action required.';
      } else if (content.includes('c2') || content.includes('potentially dangerous')) {
        return 'Electrical safety issues found. Remedial work required.';
      } else if (content.includes('c3') || content.includes('improvement recommended')) {
        return 'Electrical installation satisfactory with minor improvements recommended.';
      }
      break;
      
    case 'Fire Risk Assessment':
      if (content.includes('high risk') || content.includes('significant findings')) {
        return 'Fire safety risks identified. Action plan required.';
      } else if (content.includes('low risk') || content.includes('satisfactory')) {
        return 'Fire safety assessment satisfactory. Regular review recommended.';
      }
      break;
      
    case 'Lease Agreement':
      return 'Lease agreement document. Review terms and conditions carefully.';
      
    case 'Insurance Certificate':
      return 'Insurance certificate. Verify coverage and expiry dates.';
      
    case 'Major Works Scope':
      return 'Major works scope document. Review specifications and costs.';
      
    case 'Minutes/AGM':
      return 'Meeting minutes or AGM document. Review decisions and actions.';
  }
  
  // Generic summary based on content length
  if (text.length > 1000) {
    return 'Comprehensive document with substantial content. Review for key findings and requirements.';
  } else if (text.length > 100) {
    return 'Document with moderate content. Review for important information.';
  } else {
    return 'Document with limited text content. Consider re-uploading with OCR if scanned.';
  }
}

/**
 * Validate if extracted text is sufficient for AI analysis
 */
export function isTextSufficientForAnalysis(text: string): boolean {
  return text.trim().length >= 50;
}

/**
 * Clean and normalize extracted text
 */
export function cleanExtractedText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n\s*\n/g, '\n') // Remove excessive line breaks
    .trim();
}
