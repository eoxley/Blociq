import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { JSDOM } from 'jsdom';

export async function extractText(file: File): Promise<{ text: string, meta: { name: string, type: string, bytes: number } }> {
  const arr = await file.arrayBuffer();
  const buf = Buffer.from(arr);
  const name = file.name;
  const type = file.type || guessType(name);
  let text = '';

  // Primary extraction methods
  if (type.includes('pdf') || name.toLowerCase().endsWith('.pdf')) {
    try {
      const res = await pdfParse(buf);
      text = res.text || '';
    } catch (error) {
      console.log('⚠️ PDF parsing failed, trying OCR fallback...');
      text = await tryOCRFallback(buf, name);
    }
  } else if (type.includes('word') || name.toLowerCase().endsWith('.docx')) {
    try {
      const { value } = await mammoth.extractRawText({ buffer: buf });
      text = value || '';
    } catch (error) {
      console.log('⚠️ Word document parsing failed, trying OCR fallback...');
      text = await tryOCRFallback(buf, name);
    }
  } else if (
    type.includes('text') ||
    name.endsWith('.txt') ||
    name.endsWith('.csv') ||
    name.endsWith('.md')
  ) {
    text = buf.toString('utf-8');
  } else if (type.includes('html') || name.endsWith('.html') || name.endsWith('.htm')) {
    const dom = new JSDOM(buf.toString('utf-8'));
    text = dom.window.document.body.textContent || '';
  } else if (type.includes('image') || /\.(jpg|jpeg|png|gif|bmp|tiff)$/i.test(name)) {
    // For images, try OCR directly
    console.log('🖼️ Image detected, attempting OCR...');
    text = await tryOCRFallback(buf, name);
  } else {
    // Best-effort fallback with OCR
    console.log('🔄 Unknown file type, attempting OCR fallback...');
    text = await tryOCRFallback(buf, name);
  }

  // If we still don't have text, try the enhanced document processor
  if (!text || text.trim().length < 10) {
    console.log('🔄 Text extraction yielded insufficient content, trying enhanced processor...');
    try {
      const { extractTextFromPDF } = await import('./extractTextFromPdf');
      const result = await extractTextFromPDF(buf, name);
      if (result.text && result.text.trim().length > 10) {
        text = result.text;
        console.log('✅ Enhanced processor succeeded');
      }
    } catch (error) {
      console.log('⚠️ Enhanced processor failed:', error);
    }
  }

  const MAX = 200_000;
  if (text.length > MAX) {
    text = text.slice(0, MAX) + `\n\n[Truncated to ${MAX} chars]`;
  }

  return { text, meta: { name, type, bytes: buf.byteLength } };
}

// OCR fallback function using existing infrastructure
async function tryOCRFallback(buffer: Buffer, fileName: string): Promise<string> {
  try {
    // Try the existing OCR infrastructure
    const { ocrWithFallbacks } = await import('./ocr');
    const result = await ocrWithFallbacks(buffer);
    console.log(`✅ OCR succeeded using ${result.method} (confidence: ${result.confidence})`);
    return result.text;
  } catch (error) {
    console.log('⚠️ OCR fallback failed:', error);
    
    // Try alternative OCR methods
    try {
      const { extractTextFromPDF } = await import('./extractTextFromPdf');
      const result = await extractTextFromPDF(buffer, fileName);
      if (result.text && result.text.trim().length > 10) {
        console.log('✅ Alternative extraction succeeded');
        return result.text;
      }
    } catch (altError) {
      console.log('⚠️ Alternative extraction failed:', altError);
    }
    
    // Final fallback message
    return `[OCR Fallback Failed] Unable to extract text from ${fileName}. This may be a scanned document, image, or corrupted file. Please try uploading a different version or contact support for assistance.`;
  }
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
