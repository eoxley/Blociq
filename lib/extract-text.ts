import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
// @ts-ignore - jsdom types not available
import { JSDOM } from 'jsdom';

export async function extractText(buf: Uint8Array, name?: string): Promise<{ text: string, meta: { name: string, type: string, bytes: number } }> {
  const buffer = Buffer.from(buf);
  const fileName = name || 'document';
  const type = guessType(fileName);
  let text = '';

  // Primary extraction methods
  if (type.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
    try {
      const res = await pdfParse(buffer);
      text = res.text || '';
      console.log('✅ PDF parsing succeeded, extracted', text.length, 'characters');
    } catch (error) {
      console.log('⚠️ PDF parsing failed, trying OCR fallback...', error);
      text = await tryOCRFallback(buffer, fileName);
    }
  } else if (type.includes('word') || fileName.toLowerCase().endsWith('.docx')) {
    try {
      const { value } = await mammoth.extractRawText({ buffer });
      text = value || '';
      console.log('✅ Word document parsing succeeded, extracted', text.length, 'characters');
    } catch (error) {
      console.log('⚠️ Word document parsing failed, trying OCR fallback...', error);
      text = await tryOCRFallback(buffer, fileName);
    }
  } else if (
    type.includes('text') ||
    fileName.endsWith('.txt') ||
    fileName.endsWith('.csv') ||
    fileName.endsWith('.md')
  ) {
    text = buffer.toString('utf-8');
    console.log('✅ Text file parsing succeeded, extracted', text.length, 'characters');
  } else if (type.includes('html') || fileName.endsWith('.html') || fileName.endsWith('.htm')) {
    const dom = new JSDOM(buffer.toString('utf-8'));
    text = dom.window.document.body.textContent || '';
    console.log('✅ HTML parsing succeeded, extracted', text.length, 'characters');
  } else if (type.includes('image') || /\.(jpg|jpeg|png|gif|bmp|tiff)$/i.test(fileName)) {
    // For images, try OCR directly
    console.log('🖼️ Image detected, attempting OCR...');
    text = await tryOCRFallback(buffer, fileName);
  } else {
    // Best-effort fallback with OCR
    console.log('🔄 Unknown file type, attempting OCR fallback...');
    text = await tryOCRFallback(buffer, fileName);
  }

  // If we still don't have text, try the enhanced document processor
  if (!text || text.trim().length < 10) {
    console.log('🔄 Text extraction yielded insufficient content, trying enhanced processor...');
    try {
      const { extractTextFromPDF } = await import('./extractTextFromPdf');
      const result = await extractTextFromPDF(buffer, fileName);
      if (result.text && result.text.trim().length > 10) {
        text = result.text;
        console.log('✅ Enhanced processor succeeded, extracted', text.length, 'characters');
      }
    } catch (error) {
      console.log('⚠️ Enhanced processor failed:', error);
    }
  }

  // Final validation - if we still don't have text, throw an error
  if (!text || text.trim().length < 10) {
    console.error('❌ CRITICAL: All text extraction methods failed for', fileName);
    throw new Error(`Unable to extract text from ${fileName}. All extraction methods failed.`);
  }

  const MAX = 200_000;
  if (text.length > MAX) {
    text = text.slice(0, MAX) + `\n\n[Truncated to ${MAX} chars]`;
  }

  console.log('✅ Final text extraction result:', text.length, 'characters for', fileName);
  return { text, meta: { name: fileName, type, bytes: buffer.byteLength } };
}

// OCR fallback function using existing infrastructure
async function tryOCRFallback(buffer: Buffer, fileName: string): Promise<string> {
  console.log('🔄 Starting OCR fallback for:', fileName);
  
  try {
    // Try the existing OCR infrastructure first
    console.log('🔄 Attempting primary OCR method...');
    const { processDocumentOCR } = await import('./ocr');
    
    // Create a File object from the buffer for OCR
    const file = new File([buffer], fileName, { type: 'application/pdf' });
    const result = await processDocumentOCR(file);
    
    console.log(`✅ Primary OCR succeeded (confidence: ${result.confidence || 'unknown'})`);
    
    if (result.text && result.text.trim().length > 10) {
      return result.text;
    } else {
      console.log('⚠️ Primary OCR returned insufficient text, trying alternatives...');
    }
  } catch (error) {
    console.log('⚠️ Primary OCR failed:', error);
  }
  
  // Try alternative PDF extraction
  try {
    console.log('🔄 Attempting alternative PDF extraction...');
    const { extractTextFromPDF } = await import('./extractTextFromPdf');
    const result = await extractTextFromPDF(buffer, fileName);
    if (result.text && result.text.trim().length > 10) {
      console.log('✅ Alternative PDF extraction succeeded, extracted', result.text.length, 'characters');
      return result.text;
    }
  } catch (altError) {
    console.log('⚠️ Alternative PDF extraction failed:', altError);
  }
  
  // If all OCR methods fail, throw a detailed error
  console.error('❌ All OCR methods failed for:', fileName);
  throw new Error(`OCR extraction failed for ${fileName}. All methods attempted: primary OCR, PDF extraction.`);
}

function guessType(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html';
  return 'application/octet-stream';
}
