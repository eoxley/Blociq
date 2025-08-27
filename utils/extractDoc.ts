import { createClient } from '@supabase/supabase-js';

export interface ExtractionResult {
  text: string;
  pageCount: number;
  ocrTried: boolean;
  ocrNeeded: boolean;
}

export async function extractDocumentText(
  file: File | Buffer,
  fileName?: string
): Promise<ExtractionResult> {
  // Ensure we're on the server side
  if (typeof window !== 'undefined') {
    throw new Error('Document extraction can only be performed on the server side');
  }

  const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
  const contentType = file instanceof File ? file.type : 'application/octet-stream';
  
  // Determine file type
  const isPDF = contentType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf');
  const isImage = contentType.startsWith('image/') || 
    /\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/i.test(fileName || '');

  if (isPDF) {
    return await extractPDFText(buffer);
  } else if (isImage) {
    return await extractImageText(buffer);
  } else {
    // For other file types (docx, etc.), return empty for now
    return {
      text: '',
      pageCount: 0,
      ocrTried: false,
      ocrNeeded: true
    };
  }
}

async function extractPDFText(buffer: Buffer): Promise<ExtractionResult> {
  try {
    // Dynamic import to prevent build-time evaluation
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(buffer);
    
    return {
      text: data.text || '',
      pageCount: data.numpages || 0,
      ocrTried: false,
      ocrNeeded: false
    };
  } catch (error) {
    console.error('PDF parsing failed:', error);
    return {
      text: '',
      pageCount: 0,
      ocrTried: false,
      ocrNeeded: true
    };
  }
}

async function extractImageText(buffer: Buffer): Promise<ExtractionResult> {
  // Try Google Cloud Vision first (preferred method)
  const visionCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (visionCreds) {
    try {
      const vision = await import('@google-cloud/vision');
      const client = new vision.ImageAnnotatorClient({
        credentials: JSON.parse(visionCreds)
      });

      const [result] = await client.textDetection({
        image: { content: buffer.toString('base64') }
      });
      const detections = result.textAnnotations;
      const text = detections?.[0]?.description || '';
      
      return {
        text,
        pageCount: 1,
        ocrTried: true,
        ocrNeeded: false
      };
    } catch (gcvError) {
      console.error('Google Cloud Vision OCR failed:', gcvError);
    }
  }

  // All OCR methods failed
  return {
    text: '',
    pageCount: 1,
    ocrTried: true,
    ocrNeeded: true
  };
}

// Helper function to truncate text for AI processing
export function truncateText(text: string, maxLength: number = 15000): string {
  if (text.length <= maxLength) return text;
  
  // Try to truncate at a sentence boundary
  const truncated = text.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');
  const lastNewline = truncated.lastIndexOf('\n');
  const lastBreak = Math.max(lastSentence, lastNewline);
  
  if (lastBreak > maxLength * 0.8) {
    return truncated.substring(0, lastBreak + 1);
  }
  
  return truncated + '...';
}

// Simplified PDF extraction function for direct use
export async function extractFromPDF(input: File | Blob | Buffer) {
  // Ensure we're on the server side
  if (typeof window !== 'undefined') {
    throw new Error('PDF extraction can only be performed on the server side');
  }

  let buffer: Buffer;
  if (Buffer.isBuffer(input as any)) {
    buffer = input as Buffer;
  } else if (typeof (input as any)?.arrayBuffer === "function") {
    const ab = await (input as Blob).arrayBuffer();
    buffer = Buffer.from(ab);
  } else {
    throw new Error("Unsupported input for PDF extraction");
  }

  try {
    const data = await (await import('pdf-parse')).default(buffer);
    return {
      text: (data.text || "").trim(),
      pageCount: data.numpages || 0,
      ocrTried: false
    };
  } catch (error) {
    console.error('PDF extraction failed:', error);
    return {
      text: "",
      pageCount: 0,
      ocrTried: false
    };
  }
}
