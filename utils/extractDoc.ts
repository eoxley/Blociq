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
    // Try pdf-parse first
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
    
    // Fallback to pdfjs-dist if available
    try {
      const pdfjsLib = await import('pdfjs-dist');
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      return {
        text: fullText.trim(),
        pageCount: pdf.numPages,
        ocrTried: false,
        ocrNeeded: false
      };
    } catch (pdfjsError) {
      console.error('PDF.js parsing also failed:', pdfjsError);
      return {
        text: '',
        pageCount: 0,
        ocrTried: false,
        ocrNeeded: true
      };
    }
  }
}

async function extractImageText(buffer: Buffer): Promise<ExtractionResult> {
  // Try Tesseract OCR if available
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    
    return {
      text: text || '',
      pageCount: 1,
      ocrTried: true,
      ocrNeeded: false
    };
  } catch (error) {
    console.error('Tesseract OCR failed:', error);
    
    // Try Google Cloud Vision if credentials are available
    if (process.env.GOOGLE_CLOUD_VISION_CREDENTIALS) {
      try {
        const vision = await import('@google-cloud/vision');
        const client = new vision.ImageAnnotatorClient({
          credentials: JSON.parse(process.env.GOOGLE_CLOUD_VISION_CREDENTIALS)
        });
        
        const [result] = await client.textDetection(buffer);
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
