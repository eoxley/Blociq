// lib/pdf-parse-wrapper.ts
// Safe PDF parser wrapper to prevent debug mode and environment issues

import pdfParse from 'pdf-parse';

interface PdfParseOptions {
  normalizeWhitespace?: boolean;
  disableFontFace?: boolean;
  disableEmbeddedFonts?: boolean;
  max?: number;
}

interface PdfParseResult {
  numpages: number;
  numrender: number;
  info: any;
  metadata: any;
  text: string;
}

export async function safePdfParse(
  buffer: Buffer, 
  options: PdfParseOptions = {}
): Promise<PdfParseResult> {
  try {
    // Default options for safe parsing
    const safeOptions = {
      normalizeWhitespace: false,
      disableFontFace: true,
      disableEmbeddedFonts: true,
      max: 0, // no limit on pages
      ...options
    };

    // Parse PDF with error handling
    const result = await pdfParse(buffer, safeOptions);
    
    return {
      numpages: result.numpages || 0,
      numrender: result.numrender || 0,
      info: result.info || {},
      metadata: result.metadata || {},
      text: result.text || ""
    };
  } catch (error) {
    console.warn('PDF parsing failed:', error instanceof Error ? error.message : 'Unknown error');
    
    // Return empty result on failure
    return {
      numpages: 0,
      numrender: 0,
      info: {},
      metadata: {},
      text: ""
    };
  }
}

// Alternative function for direct use
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const result = await safePdfParse(buffer);
    return result.text || "";
  } catch (error) {
    console.warn('PDF text extraction failed:', error instanceof Error ? error.message : 'Unknown error');
    return "";
  }
}

export default safePdfParse;