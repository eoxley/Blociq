import pdfParse from 'pdf-parse';
import { ocrWithGoogleVision } from './ocr';

export async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
  try {
    console.log('📄 Starting PDF text extraction...');
    
    // First attempt: Use pdf-parse
    const { text } = await pdfParse(fileBuffer);
    
    // Check if we got meaningful content (more than 50 characters)
    if (text && text.trim().length > 50) {
      console.log('✅ PDF text extracted successfully with pdf-parse');
      console.log(`📊 Extracted ${text.length} characters`);
      return text.trim();
    }
    
    console.log('⚠️ pdf-parse returned insufficient text, trying OCR...');
    
    // Fallback: Use Google Cloud Vision OCR
    const ocrText = await ocrWithGoogleVision(fileBuffer);
    
    if (ocrText && ocrText.trim().length > 50) {
      console.log('✅ OCR text extraction successful');
      console.log(`📊 Extracted ${ocrText.length} characters via OCR`);
      return ocrText.trim();
    }
    
    console.log('❌ Both pdf-parse and OCR failed to extract meaningful text');
    throw new Error('Unable to extract text from PDF using both pdf-parse and OCR');
    
  } catch (error) {
    console.error('❌ Error in PDF text extraction:', error);
    
    // If pdf-parse fails, try OCR as fallback
    if (error instanceof Error && error.message.includes('pdf-parse')) {
      console.log('🔄 pdf-parse failed, attempting OCR fallback...');
      try {
        const ocrText = await ocrWithGoogleVision(fileBuffer);
        if (ocrText && ocrText.trim().length > 50) {
          console.log('✅ OCR fallback successful');
          return ocrText.trim();
        }
      } catch (ocrError) {
        console.error('❌ OCR fallback also failed:', ocrError);
      }
    }
    
    throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to validate PDF content
export function validatePDFContent(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }
  
  // Check for common PDF artifacts that indicate failed extraction
  const invalidPatterns = [
    /^\s*$/, // Only whitespace
    /^[^\w\s]*$/, // No alphanumeric characters
    /^[^\w]*$/, // No word characters at all
  ];
  
  return !invalidPatterns.some(pattern => pattern.test(text.trim()));
}

// Enhanced extraction with content validation
export async function extractTextFromPDFWithValidation(fileBuffer: Buffer): Promise<{
  text: string;
  method: 'pdf-parse' | 'ocr' | 'failed';
  confidence: number;
}> {
  try {
    console.log('📄 Starting enhanced PDF text extraction...');
    
    // First attempt: Use pdf-parse
    const { text: pdfText } = await pdfParse(fileBuffer);
    
    if (pdfText && validatePDFContent(pdfText)) {
      console.log('✅ PDF text extracted successfully with pdf-parse');
      return {
        text: pdfText.trim(),
        method: 'pdf-parse',
        confidence: 0.9
      };
    }
    
    console.log('⚠️ pdf-parse validation failed, trying OCR...');
    
    // Fallback: Use Google Cloud Vision OCR
    const ocrText = await ocrWithGoogleVision(fileBuffer);
    
    if (ocrText && validatePDFContent(ocrText)) {
      console.log('✅ OCR text extraction successful');
      return {
        text: ocrText.trim(),
        method: 'ocr',
        confidence: 0.7
      };
    }
    
    throw new Error('Both extraction methods failed validation');
    
  } catch (error) {
    console.error('❌ Enhanced PDF extraction failed:', error);
    throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
