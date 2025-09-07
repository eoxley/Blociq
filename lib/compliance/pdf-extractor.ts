/**
 * Lightweight PDF text extraction for compliance documents
 * Uses pdf-parse for embedded text extraction (no OCR)
 */

import * as pdf from 'pdf-parse';

export interface ExtractedText {
  text: string;
  pageCount: number;
  pages: { [pageNumber: number]: string };
}

/**
 * Extract text from PDF buffer
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    console.log('📖 Starting PDF text extraction...');
    
    const data = await pdf(buffer, {
      // Options for better text extraction
      normalizeWhitespace: true,
      disableCombineTextItems: false
    });

    console.log(`✅ Extracted text: ${data.text.length} characters from ${data.numpages} pages`);
    
    return data.text;
  } catch (error) {
    console.error('❌ PDF text extraction failed:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text with page mapping
 */
export async function extractTextWithPages(buffer: Buffer): Promise<ExtractedText> {
  try {
    console.log('📖 Starting PDF text extraction with page mapping...');
    
    const data = await pdf(buffer, {
      normalizeWhitespace: true,
      disableCombineTextItems: false
    });

    // Create page mapping (simplified - pdf-parse doesn't provide per-page text)
    const pages: { [pageNumber: number]: string } = {};
    const textPerPage = Math.ceil(data.text.length / data.numpages);
    
    for (let i = 0; i < data.numpages; i++) {
      const start = i * textPerPage;
      const end = Math.min(start + textPerPage, data.text.length);
      pages[i + 1] = data.text.substring(start, end);
    }

    console.log(`✅ Extracted text: ${data.text.length} characters from ${data.numpages} pages`);

    return {
      text: data.text,
      pageCount: data.numpages,
      pages
    };
  } catch (error) {
    console.error('❌ PDF text extraction with pages failed:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Check if PDF has embedded text (not just images)
 */
export async function hasEmbeddedText(buffer: Buffer): Promise<boolean> {
  try {
    const data = await pdf(buffer, {
      normalizeWhitespace: true,
      disableCombineTextItems: false
    });

    // If we get meaningful text (more than just whitespace), it has embedded text
    const meaningfulText = data.text.replace(/\s+/g, '').length;
    return meaningfulText > 50; // At least 50 non-whitespace characters
  } catch (error) {
    console.error('❌ PDF text check failed:', error);
    return false;
  }
}
