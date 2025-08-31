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
    console.log(`🔍 Starting Google Vision OCR for ${filename}`);
    console.log(`📊 File details: size=${buf.length} bytes, type=${filename.toLowerCase().split('.').pop()}`);
    
    // Check if Google Vision is configured
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_PROJECT_ID) {
      console.log('⚠️ Google Vision not configured - missing environment variables');
      console.log('🔍 Environment check:', {
        hasEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
        hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
        hasProject: !!process.env.GOOGLE_PROJECT_ID,
        hasJsonCreds: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
        hasCredsFile: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
      });
      return "";
    }

    // Dynamic import to avoid issues if credentials aren't available
    console.log('📦 Importing Google Vision client...');
    const { getVisionClient } = await import('../../../ocrClient');
    
    console.log('🔧 Getting Vision client...');
    const client = getVisionClient();
    
    if (!client) {
      console.error('❌ Failed to get Google Vision client');
      return "";
    }
    
    console.log('✅ Google Vision client obtained successfully');
    
    // Determine the best OCR method based on file type
    const fileExtension = filename.toLowerCase().split('.').pop();
    const isPDF = fileExtension === 'pdf';
    
    console.log(`📋 File type: ${fileExtension}, isPDF: ${isPDF}`);
    
    let ocrResult: string = '';
    
             if (isPDF) {
           // For PDFs, try multiple approaches in order of preference
           console.log('📄 Processing PDF - trying multiple OCR approaches...');
           
           // Approach 1: Try Google Vision API directly on PDF (it supports PDF input)
           try {
             console.log('🔍 Approach 1: Direct PDF processing with Google Vision...');
             
             const requestPayload = {
               image: {
                 content: buf.toString('base64')
               }
             };
             
             console.log('📤 Sending DOCUMENT_TEXT_DETECTION request for PDF...');
             
             const [result] = await client.documentTextDetection(requestPayload);
             
             console.log('📥 DOCUMENT_TEXT_DETECTION response received');
             console.log('📊 Response details:', {
               hasFullText: !!result.fullTextAnnotation,
               textLength: result.fullTextAnnotation?.text?.length || 0,
               pages: result.fullTextAnnotation?.pages?.length || 0
             });
             
             ocrResult = result.fullTextAnnotation?.text || '';
             
             // If document detection worked well, we're done
             if (ocrResult.length > 50) {
               console.log('✅ Direct PDF processing successful!');
             } else {
               console.log('⚠️ Direct PDF processing yielded poor results, trying text detection...');
               try {
                 const [fallbackResult] = await client.textDetection(requestPayload);
                 ocrResult = fallbackResult.textAnnotations?.[0]?.description || '';
                 console.log('📊 Text detection result length:', ocrResult.length);
               } catch (textDetectionError) {
                 console.log('⚠️ Text detection also failed, keeping document detection result');
                 // Keep the original ocrResult from document detection
               }
             }
             
           } catch (directPdfError) {
             console.error('❌ Direct PDF processing failed:', directPdfError);
             
             // Approach 2: Try converting PDF to image first
             try {
               console.log('🔍 Approach 2: Converting PDF to image first...');
               
               // Convert PDF to image
               const { convertPdfToSingleImage } = await import('../../../lib/pdf-to-image');
               const imageBuffer = await convertPdfToSingleImage(buf);
               
               console.log('🖼️ PDF converted to image, size:', imageBuffer.length, 'bytes');
               
               // Now use Google Vision OCR on the image
               console.log('🔍 Using Google Vision OCR on converted image...');
               
               const imageRequestPayload = {
                 image: {
                   content: imageBuffer.toString('base64')
                 }
               };
               
               console.log('📤 Sending DOCUMENT_TEXT_DETECTION request for converted image...');
               
               const [imageResult] = await client.documentTextDetection(imageRequestPayload);
               
               console.log('📥 DOCUMENT_TEXT_DETECTION response received');
               console.log('📊 Response details:', {
                 hasFullText: !!imageResult.fullTextAnnotation,
                 textLength: imageResult.fullTextAnnotation?.text?.length || 0,
                 pages: imageResult.fullTextAnnotation?.pages?.length || 0
               });
               
               ocrResult = imageResult.fullTextAnnotation?.text || '';
               
               // If document detection didn't work well, fallback to regular text detection
               if (ocrResult.length < 50) {
                 console.log('⚠️ Image document detection yielded poor results, trying text detection fallback');
                 try {
                   const [fallbackResult] = await client.textDetection(imageRequestPayload);
                   ocrResult = fallbackResult.textAnnotations?.[0]?.description || '';
                   console.log('📊 Fallback text detection result length:', ocrResult.length);
                 } catch (textDetectionError) {
                   console.log('⚠️ Text detection fallback also failed, keeping document detection result');
                   // Keep the original ocrResult from document detection
                 }
               }
               
             } catch (pdfImageError) {
               console.error('❌ PDF to image conversion failed:', pdfImageError);
               
               // Try to get more details about the error
               if (pdfImageError instanceof Error) {
                 console.error('📋 Error details:', {
                   name: pdfImageError.name,
                   message: pdfImageError.message,
                   stack: pdfImageError.stack
                 });
               }
               
               // Approach 3: Last resort - try processing raw buffer as image
               try {
                 console.log('🔄 Approach 3: Last resort - processing raw buffer as image...');
                 const [lastResortResult] = await client.textDetection({
                   image: {
                     content: buf.toString('base64')
                   }
                 });
                 ocrResult = lastResortResult.textAnnotations?.[0]?.description || '';
                 console.log('📊 Last resort result length:', ocrResult.length);
               } catch (lastResortError) {
                 console.error('❌ All PDF processing approaches failed:', lastResortError);
                 throw lastResortError;
               }
             }
           }
    } else {
      // For images, use regular TEXT_DETECTION
      console.log('🖼️ Using TEXT_DETECTION for image file');
      
      try {
        const requestPayload = {
          image: {
            content: buf.toString('base64')
          }
        };
        
        console.log('📤 Sending TEXT_DETECTION request...');
        const [result] = await client.textDetection(requestPayload);
        
        console.log('📥 TEXT_DETECTION response received');
        console.log('📊 Response details:', {
          hasTextAnnotations: !!result.textAnnotations,
          annotationCount: result.textAnnotations?.length || 0
        });
        
        ocrResult = result.textAnnotations?.[0]?.description || '';
      } catch (imageError) {
        console.error('❌ Image processing failed:', imageError);
        throw imageError;
      }
    }
    
    // Clean up the extracted text
    const cleanedText = ocrResult
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    console.log(`✅ Google Vision OCR completed for ${filename}: ${cleanedText.length} characters extracted`);
    console.log(`📝 First 100 chars: ${cleanedText.substring(0, 100)}...`);
    
    if (cleanedText.length === 0) {
      console.log('⚠️ OCR returned empty text - this might indicate an issue');
    }
    
    return cleanedText;
    
  } catch (error) {
    console.error('❌ Google Vision OCR failed for', filename, ':', error);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('📋 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    // Check for specific Google Vision API errors
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('🔍 Google Vision API error code:', (error as any).code);
    }
    
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
