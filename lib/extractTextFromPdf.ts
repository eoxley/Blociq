// import pdfParse from 'pdf-parse'; // Using dynamic import to avoid test file issues
import mammoth from 'mammoth';
// @ts-ignore - jsdom types not available
import { JSDOM } from 'jsdom';

interface ExtractionResult {
  text: string;
  meta: {
    name: string;
    type: string;
    bytes: number;
  };
}

interface FileTypeInfo {
  mimeType: string;
  category: 'pdf' | 'word' | 'text' | 'html' | 'image' | 'unknown';
  isSupported: boolean;
}

const CONFIG = {
  MAX_TEXT_LENGTH: 200_000,
  MIN_TEXT_LENGTH: 10,
  TIMEOUT_MS: 30_000,
} as const;

class TextExtractionService {
  private static instance: TextExtractionService;

  static getInstance(): TextExtractionService {
    if (!TextExtractionService.instance) {
      TextExtractionService.instance = new TextExtractionService();
    }
    return TextExtractionService.instance;
  }

  async extractText(buffer: Buffer, fileName: string = 'document'): Promise<string> {
    const fileInfo = this.analyzeFile(buffer, fileName);
    
    if (!fileInfo.isSupported) {
      throw new Error(`Unsupported file type: ${fileInfo.mimeType}`);
    }

    try {
      let text = '';

      switch (fileInfo.category) {
        case 'pdf':
          text = await this.extractFromPDF(buffer);
          break;
        case 'word':
          text = await this.extractFromWord(buffer);
          break;
        case 'text':
          text = await this.extractFromText(buffer);
          break;
        case 'html':
          text = await this.extractFromHTML(buffer);
          break;
        case 'image':
          text = await this.extractFromImage(buffer, fileName);
          break;
        default:
          throw new Error(`No extractor for category: ${fileInfo.category}`);
      }

      if (this.isValidText(text)) {
        return this.postProcessText(text);
      }

      // Try fallback methods
      return await this.tryFallbackExtraction(buffer, fileName);

    } catch (error) {
      console.warn(`Primary extraction failed for ${fileName}:`, error);
      return await this.tryFallbackExtraction(buffer, fileName);
    }
  }

  private analyzeFile(buffer: Buffer, fileName: string): FileTypeInfo {
    const signature = this.getFileSignature(buffer);
    const extension = this.getFileExtension(fileName);
    
    // PDF signature: %PDF
    if (signature.startsWith('25504446') || extension === '.pdf') {
      return {
        mimeType: 'application/pdf',
        category: 'pdf',
        isSupported: true
      };
    }
    
    // ZIP signature (for DOCX): PK
    if (signature.startsWith('504b') && extension === '.docx') {
      return {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        category: 'word',
        isSupported: true
      };
    }

    // DOC signature: D0CF11E0
    if (signature.startsWith('d0cf11e0') && extension === '.doc') {
      return {
        mimeType: 'application/msword',
        category: 'word',
        isSupported: true
      };
    }

    // Image signatures
    const imageSignatures = {
      'ffd8ff': 'image/jpeg',
      '89504e': 'image/png',
      '474946': 'image/gif',
      '424d': 'image/bmp',
      '49492a': 'image/tiff',
    };

    for (const [sig, mimeType] of Object.entries(imageSignatures)) {
      if (signature.startsWith(sig)) {
        return {
          mimeType,
          category: 'image',
          isSupported: true
        };
      }
    }

    // Fallback to extension-based detection
    return this.analyzeByExtension(extension);
  }

  private getFileSignature(buffer: Buffer): string {
    return buffer.subarray(0, 8).toString('hex').toLowerCase();
  }

  private getFileExtension(fileName: string): string {
    return fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  }

  private analyzeByExtension(extension: string): FileTypeInfo {
    const extensionMap: Record<string, FileTypeInfo> = {
      '.txt': { mimeType: 'text/plain', category: 'text', isSupported: true },
      '.csv': { mimeType: 'text/csv', category: 'text', isSupported: true },
      '.md': { mimeType: 'text/markdown', category: 'text', isSupported: true },
      '.html': { mimeType: 'text/html', category: 'html', isSupported: true },
      '.htm': { mimeType: 'text/html', category: 'html', isSupported: true },
      '.jpg': { mimeType: 'image/jpeg', category: 'image', isSupported: true },
      '.jpeg': { mimeType: 'image/jpeg', category: 'image', isSupported: true },
      '.png': { mimeType: 'image/png', category: 'image', isSupported: true },
    };

    return extensionMap[extension] || {
      mimeType: 'application/octet-stream',
      category: 'unknown',
      isSupported: false
    };
  }

  private async extractFromPDF(buffer: Buffer): Promise<string> {
    const result = await pdfParse(buffer);
    const text = result.text || '';
    
    if (!this.isValidText(text)) {
      throw new Error('PDF extraction yielded insufficient text');
    }
    
    return text;
  }

  private async extractFromWord(buffer: Buffer): Promise<string> {
    const { value } = await mammoth.extractRawText({ buffer });
    const text = value || '';
    
    if (!this.isValidText(text)) {
      throw new Error('Word extraction yielded insufficient text');
    }
    
    return text;
  }

  private extractFromText(buffer: Buffer): Promise<string> {
    const text = buffer.toString('utf-8');
    
    if (!this.isValidText(text)) {
      throw new Error('Text file appears to be empty or corrupted');
    }
    
    return Promise.resolve(text);
  }

  private extractFromHTML(buffer: Buffer): Promise<string> {
    try {
      const dom = new JSDOM(buffer.toString('utf-8'));
      const text = dom.window.document.body?.textContent || '';
      
      if (!this.isValidText(text)) {
        throw new Error('HTML extraction yielded insufficient text');
      }
      
      return Promise.resolve(text);
    } catch (error) {
      throw new Error(`HTML parsing failed: ${error}`);
    }
  }

  private async extractFromImage(buffer: Buffer, fileName: string): Promise<string> {
    try {
      const { processDocumentOCR } = await import('./ocr');
      
      // Create proper blob for OCR
      const blob = new Blob([buffer], { type: 'image/*' });
      
      // Convert to File-like object for OCR compatibility
      const fileForOCR = Object.assign(blob, {
        name: fileName,
        lastModified: Date.now(),
      }) as File;

      const result = await processDocumentOCR(fileForOCR);
      
      if (result.text && this.isValidText(result.text)) {
        return result.text + ' [OCR Fallback]';
      }

      throw new Error('OCR returned insufficient text');

    } catch (error) {
      throw new Error(`OCR processing failed: ${error}`);
    }
  }

  private async tryFallbackExtraction(buffer: Buffer, fileName: string): Promise<string> {
    const fallbackStrategies = [
      () => this.performOCR(buffer, fileName),
      () => this.tryEnhancedProcessor(buffer, fileName),
      () => this.tryRawTextExtraction(buffer)
    ];

    for (const strategy of fallbackStrategies) {
      try {
        const text = await this.withTimeout(
          strategy(),
          CONFIG.TIMEOUT_MS,
          'Fallback extraction timeout'
        );

        if (this.isValidText(text)) {
          return this.postProcessText(text);
        }
      } catch (error) {
        console.warn('Fallback strategy failed:', error);
        continue;
      }
    }

    throw new Error(`All extraction methods failed for ${fileName}`);
  }

  private async performOCR(buffer: Buffer, fileName: string): Promise<string> {
    try {
      const { processDocumentOCR } = await import('./ocr');
      
      const blob = new Blob([buffer], { type: 'application/pdf' });
      const fileForOCR = Object.assign(blob, {
        name: fileName,
        lastModified: Date.now(),
      }) as File;

      const result = await processDocumentOCR(fileForOCR);
      
      if (result.text && this.isValidText(result.text)) {
        return result.text + ' [OCR Fallback]';
      }

      throw new Error('OCR returned insufficient text');

    } catch (error) {
      throw new Error(`OCR processing failed: ${error}`);
    }
  }

  private async tryEnhancedProcessor(buffer: Buffer, fileName: string): Promise<string> {
    try {
      const { extractTextFromPDF } = await import('./extractTextFromPdf');
      const result = await extractTextFromPDF(buffer, fileName);
      
      if (result.text && this.isValidText(result.text)) {
        return result.text + ' [Enhanced processor]';
      }

      throw new Error('Enhanced processor returned insufficient text');

    } catch (error) {
      throw new Error(`Enhanced processor failed: ${error}`);
    }
  }

  private tryRawTextExtraction(buffer: Buffer): Promise<string> {
    try {
      const encodings = ['utf-8', 'latin1', 'ascii'] as const;
      
      for (const encoding of encodings) {
        try {
          const text = buffer.toString(encoding);
          if (this.isValidText(text)) {
            return Promise.resolve(text + ' [Raw text extraction]');
          }
        } catch (error) {
          continue;
        }
      }

      throw new Error('Raw text extraction failed for all encodings');

    } catch (error) {
      return Promise.reject(error);
    }
  }

  private isValidText(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const trimmed = text.trim();
    
    if (trimmed.length < CONFIG.MIN_TEXT_LENGTH) {
      return false;
    }

    // Check if text contains mostly printable characters
    const printableChars = trimmed.replace(/[\s\n\r\t]/g, '').length;
    const totalChars = trimmed.length;
    const printableRatio = printableChars / totalChars;

    return printableRatio >= 0.7;
  }

  private postProcessText(text: string): string {
    let cleaned = text
      .replace(/\f/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (cleaned.length > CONFIG.MAX_TEXT_LENGTH) {
      cleaned = cleaned.slice(0, CONFIG.MAX_TEXT_LENGTH) + `\n\n[Truncated to ${CONFIG.MAX_TEXT_LENGTH} chars]`;
    }

    return cleaned;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }
}

// Enhanced PDF extraction function for fallback usage
export async function extractTextFromPDF(buffer: Buffer, fileName: string): Promise<{ text: string }> {
  try {
    // Use safe PDF parser wrapper to prevent debug mode issues
    const { safePdfParse } = await import('./pdf-parse-wrapper');
    
    const result = await safePdfParse(buffer, {
      normalizeWhitespace: false,
      disableFontFace: true,
      disableEmbeddedFonts: true,
      max: 0
    });
    
    const text = result.text || '';
    
    if (text.trim().length < 10) {
      throw new Error('Extracted text too short, may indicate parsing issues');
    }
    
    return { text };
    
  } catch (error) {
    console.warn(`Enhanced PDF extraction failed for ${fileName}:`, error);
    // Error messages are already cleaned by the wrapper
    throw new Error(`Enhanced PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Main export function
export async function extractText(buf: Uint8Array, name?: string): Promise<ExtractionResult> {
  const buffer = Buffer.from(buf);
  const fileName = name || 'document';
  
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty buffer provided for text extraction');
  }

  if (buffer.length > 50 * 1024 * 1024) {
    throw new Error('File too large for text extraction (max 50MB)');
  }

  const extractor = TextExtractionService.getInstance();
  
  try {
    const text = await extractor.extractText(buffer, fileName);
    
    return {
      text,
      meta: {
        name: fileName,
        type: guessType(fileName),
        bytes: buffer.byteLength
      }
    };

  } catch (error: any) {
    console.error(`Text extraction failed for ${fileName}:`, error);
    
    // Last resort: provide minimal fallback response instead of complete failure
    const fallbackText = `[Text extraction failed for ${fileName}. Error: ${error.message}. File size: ${buffer.byteLength} bytes. This document requires manual processing.]`;
    
    return {
      text: fallbackText,
      meta: {
        name: fileName,
        type: guessType(fileName),
        bytes: buffer.byteLength
      }
    };
  }
}

function guessType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html';
  return 'application/octet-stream';
}