import mammoth from "mammoth";
// import pdfParse from "pdf-parse"; // Using dynamic import to avoid test file issues

export async function extractTextFromBuffer(filename: string, mime: string|undefined, buf: Buffer): Promise<string> {
  const lower = (filename || "").toLowerCase();
  try {
    if (mime?.includes("pdf") || lower.endsWith(".pdf")) {
      // Use safe PDF parser wrapper to prevent debug mode issues
      const { safePdfParse } = await import("../../../lib/pdf-parse-wrapper");
      
      const r = await safePdfParse(buf, {
        normalizeWhitespace: false,
        disableFontFace: true,
        disableEmbeddedFonts: true,
        max: 0
      });
      
      if (r.text && r.text.trim().length > 50) return r.text;
      // fallback to OCR hook (optional)
      return r.text || "";
    }
    if (mime?.includes("word") || lower.endsWith(".docx")) {
      const r = await mammoth.extractRawText({ buffer: buf });
      return (r.value || "").trim();
    }
    // Plain text as a fallback
    return buf.toString("utf-8");
  } catch (e) {
    return "";
  }
}

/** Google Vision OCR fallback for documents that can't be parsed normally */
export async function ocrFallback(filename: string, buf: Buffer): Promise<string> {
  try {
    console.log(`Starting Google Vision OCR for ${filename}, buffer size: ${buf.length} bytes`);
    
    // Check if Google Vision is configured
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_PROJECT_ID) {
      console.log('Google Vision not configured - missing environment variables');
      return "";
    }

    // Dynamic import to avoid issues if credentials aren't available
    const { getVisionClient } = await import('../../../ocrClient');
    const client = getVisionClient();
    
    // Determine the best OCR method based on file type
    const fileExtension = filename.toLowerCase().split('.').pop();
    const isPDF = fileExtension === 'pdf';
    
    let ocrResult: string = '';
    
    if (isPDF) {
      // For PDFs, use DOCUMENT_TEXT_DETECTION for better layout preservation
      console.log('Using DOCUMENT_TEXT_DETECTION for PDF');
      
      const [result] = await client.documentTextDetection({
        image: {
          content: buf.toString('base64')
        }
      });
      
      ocrResult = result.fullTextAnnotation?.text || '';
      
      // If document detection didn't work well, fallback to regular text detection
      if (ocrResult.length < 50) {
        console.log('Document detection yielded poor results, trying text detection');
        const [fallbackResult] = await client.textDetection({
          image: {
            content: buf.toString('base64')
          }
        });
        ocrResult = fallbackResult.textAnnotations?.[0]?.description || '';
      }
    } else {
      // For images, use regular TEXT_DETECTION
      console.log('Using TEXT_DETECTION for image file');
      
      const [result] = await client.textDetection({
        image: {
          content: buf.toString('base64')
        }
      });
      
      ocrResult = result.textAnnotations?.[0]?.description || '';
    }
    
    // Clean up the extracted text
    const cleanedText = ocrResult
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    console.log(`Google Vision OCR completed for ${filename}: ${cleanedText.length} characters extracted`);
    console.log(`First 100 chars: ${cleanedText.substring(0, 100)}...`);
    
    return cleanedText;
    
  } catch (error) {
    console.error('Google Vision OCR failed for', filename, ':', error);
    return "";
  }
}

/** Test function to verify Google Vision setup and credentials */
export async function testGoogleVisionSetup(): Promise<void> {
  try {
    console.log('Testing Google Vision credentials...');
    
    const hasEmail = !!process.env.GOOGLE_CLIENT_EMAIL;
    const hasKey = !!process.env.GOOGLE_PRIVATE_KEY;
    const hasProject = !!process.env.GOOGLE_PROJECT_ID;
    
    console.log('Environment check:', { hasEmail, hasKey, hasProject });
    
    if (!hasEmail || !hasKey || !hasProject) {
      console.error('Missing required environment variables');
      return;
    }
    
    const { getVisionClient } = await import('../../../ocrClient');
    const client = getVisionClient();
    
    console.log('Google Vision client initialized successfully');
    
  } catch (error) {
    console.error('Google Vision setup test failed:', error);
  }
}
