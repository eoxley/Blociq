import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Processing OCR request with Google Vision directly');
    console.log('📊 Request headers:', Object.fromEntries(request.headers.entries()));
    
    // EMERGENCY DEBUG: Check environment variables
    console.log("🔧 Environment variables check:");
    console.log("GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS ? "SET" : "NOT SET");
    console.log("GOOGLE_CLIENT_EMAIL:", process.env.GOOGLE_CLIENT_EMAIL ? "SET" : "NOT SET");
    console.log("GOOGLE_PRIVATE_KEY:", process.env.GOOGLE_PRIVATE_KEY ? "SET (length: " + process.env.GOOGLE_PRIVATE_KEY.length + ")" : "NOT SET");
    console.log("GOOGLE_PROJECT_ID:", process.env.GOOGLE_PROJECT_ID ? "SET" : "NOT SET");
    console.log("GOOGLE_APPLICATION_CREDENTIALS_JSON:", process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? "SET (length: " + process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON.length + ")" : "NOT SET");
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.log('❌ No file provided in request');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    console.log('📁 File received:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    // Validate file size (Google Vision has limits)
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      console.log('❌ File too large:', file.size, 'bytes');
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }
    
             // Validate file type with more robust checking
         const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/jpg'];
         const fileExtension = file.name.toLowerCase().split('.').pop();
         const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp'];
         
         const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension || '');
         
         if (!isValidType) {
           console.log('❌ Unsupported file type:', { type: file.type, extension: fileExtension });
           return NextResponse.json(
             { 
               error: 'Unsupported file type. Please use PDF, JPEG, PNG, GIF, or BMP.',
               supportedTypes: allowedTypes,
               detectedType: file.type,
               detectedExtension: fileExtension
             },
             { status: 400 }
           );
         }
         
         console.log('✅ File type validation passed:', { type: file.type, extension: fileExtension });
    
    try {
      // Convert file to buffer for Google Vision OCR
      console.log('🔄 Converting file to buffer...');
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log('📊 Buffer created:', {
        bufferLength: buffer.length,
        bufferType: typeof buffer,
        isBuffer: Buffer.isBuffer(buffer)
      });
      
                 // EMERGENCY DEBUG: Add comprehensive logging before Google Vision API call
           console.log("🔍 EMERGENCY DEBUG: About to call Google Vision API");
           console.log("📄 File details:", {
             size: buffer.length,
             type: file.type,
             name: file.name,
             firstBytes: buffer.subarray(0, 10).toString('hex'),
             isBuffer: Buffer.isBuffer(buffer)
           });
           
           // Test Google Vision API authentication and basic connectivity first
           console.log("🔑 Testing Google Vision API authentication...");
           try {
             const { getVisionClient } = await import('../../../ocrClient');
             const visionClient = getVisionClient();
             
             console.log("✅ Vision client created successfully");
             
             // Test with a minimal API call first to verify authentication
             console.log("🧪 Testing basic API connectivity with label detection...");
             try {
               const [labelResult] = await visionClient.labelDetection({
                 image: { content: buffer.toString('base64') }
               });
               console.log("✅ API authentication working, labels found:", labelResult.labelAnnotations?.slice(0, 3)?.map(l => l.description) || 'No labels');
             } catch (labelError) {
               console.log("❌ Label detection failed:", {
                 message: labelError.message,
                 code: labelError.code,
                 details: labelError.details,
                 name: labelError.name
               });
             }
             
             // Now test TEXT_DETECTION specifically
             console.log("🔧 Testing TEXT_DETECTION API call...");
             console.log("🔧 API request payload structure:", {
               image: { content: "[BASE64_DATA_TRUNCATED]" },
               imageSize: buffer.toString('base64').length
             });
             
             try {
               const [textResult] = await visionClient.textDetection({
                 image: { content: buffer.toString('base64') }
               });
               
               console.log("✅ Google Vision TEXT_DETECTION raw response received");
               console.log("📊 Response structure:", {
                 hasTextAnnotations: !!textResult.textAnnotations,
                 annotationCount: textResult.textAnnotations?.length || 0,
                 firstAnnotation: textResult.textAnnotations?.[0]?.description?.substring(0, 100) || 'No text',
                 errorInfo: textResult.error
               });
               
               const extractedText = textResult.textAnnotations?.[0]?.description || '';
               console.log("📝 Extracted text length:", extractedText.length);
               
               if (extractedText.length > 0) {
                 console.log("✅ Direct Google Vision API call successful!");
                 
                 // Return success response with debug info
                 return NextResponse.json({
                   text: extractedText,
                   filename: file.name,
                   source: 'direct_google_vision_api',
                   timestamp: new Date().toISOString(),
                   textLength: extractedText.length,
                   debug: {
                     method: 'direct_textDetection',
                     apiWorking: true,
                     fileSize: buffer.length
                   }
                 });
               } else {
                 console.log("⚠️ Google Vision API returned empty text");
               }
               
             } catch (textDetectionError) {
               console.log("❌ TEXT_DETECTION API call failed:", {
                 message: textDetectionError.message,
                 code: textDetectionError.code,
                 details: textDetectionError.details,
                 stack: textDetectionError.stack,
                 name: textDetectionError.name,
                 toString: textDetectionError.toString()
               });
               
               // Try DOCUMENT_TEXT_DETECTION as fallback
               console.log("🔄 Trying DOCUMENT_TEXT_DETECTION as fallback...");
               try {
                 const [docResult] = await visionClient.documentTextDetection({
                   image: { content: buffer.toString('base64') }
                 });
                 
                 console.log("✅ DOCUMENT_TEXT_DETECTION response received");
                 const docText = docResult.fullTextAnnotation?.text || '';
                 console.log("📝 Document text length:", docText.length);
                 
                 if (docText.length > 0) {
                   return NextResponse.json({
                     text: docText,
                     filename: file.name,
                     source: 'direct_google_vision_document_api',
                     timestamp: new Date().toISOString(),
                     textLength: docText.length,
                     debug: {
                       method: 'document_textDetection_fallback',
                       originalError: textDetectionError.message
                     }
                   });
                 }
                 
               } catch (docDetectionError) {
                 console.log("❌ DOCUMENT_TEXT_DETECTION also failed:", {
                   message: docDetectionError.message,
                   code: docDetectionError.code,
                   details: docDetectionError.details
                 });
               }
               
               // Return the original error with full debug info
               return NextResponse.json({
                 error: 'Google Vision API call failed',
                 details: textDetectionError.message,
                 debug: {
                   originalError: textDetectionError,
                   fileInfo: {
                     size: buffer.length,
                     type: file.type,
                     name: file.name
                   },
                   apiErrorCode: textDetectionError.code,
                   apiErrorDetails: textDetectionError.details
                 },
                 filename: file.name,
                 timestamp: new Date().toISOString()
               }, { status: 500 });
             }
             
           } catch (authError) {
             console.log("❌ Google Vision authentication/setup failed:", {
               message: authError.message,
               code: authError.code,
               details: authError.details,
               stack: authError.stack
             });
             
             return NextResponse.json({
               error: 'Google Vision API authentication failed',
               details: authError.message,
               timestamp: new Date().toISOString()
             }, { status: 500 });
           }
           
           // Fallback to the original ocrFallback function if direct API calls didn't work
           console.log('🔄 Falling back to ocrFallback function...');
           const { ocrFallback } = await import('../../../src/lib/compliance/docExtract');
           
           console.log('🚀 Calling ocrFallback function...');
           const ocrText = await ocrFallback(file.name, buffer);
      
      console.log('📝 OCR result received:', {
        hasText: !!ocrText,
        textLength: ocrText?.length || 0,
        textPreview: ocrText?.substring(0, 100) || 'No text'
      });
      
                 if (ocrText && ocrText.trim().length > 0) {
             console.log('✅ Google Vision OCR successful for:', file.name);
             
             // Assess text quality
             const wordCount = ocrText.trim().split(/\s+/).length;
             const avgWordLength = wordCount > 0 ? ocrText.replace(/\s+/g, '').length / wordCount : 0;
             const hasStructure = /[.!?]\s*[A-Z]/.test(ocrText); // Check for sentence structure
             
             console.log('📊 OCR Quality Metrics:', {
               textLength: ocrText.length,
               wordCount,
               avgWordLength: avgWordLength.toFixed(2),
               hasStructure,
               startsWithText: /^[A-Za-z0-9]/.test(ocrText.trim())
             });
             
             return NextResponse.json({
               text: ocrText,
               filename: file.name,
               source: 'google_vision_ocr',
               timestamp: new Date().toISOString(),
               textLength: ocrText.length,
               qualityMetrics: {
                 wordCount,
                 avgWordLength: parseFloat(avgWordLength.toFixed(2)),
                 hasStructure,
                 confidence: wordCount > 10 && avgWordLength > 2 ? 'high' : wordCount > 5 ? 'medium' : 'low'
               }
             });
           } else {
             console.log('⚠️ Google Vision OCR returned empty text for:', file.name);
             return NextResponse.json({
               error: 'OCR processing returned no text',
               filename: file.name,
               timestamp: new Date().toISOString(),
               suggestion: 'The document may not contain readable text, may be an image without text, or may be corrupted. Try uploading a clearer image or a different file format.',
               troubleshooting: {
                 tips: [
                   'Ensure the document contains actual text (not just images)',
                   'Try a higher resolution scan if using a scanned document',
                   'Verify the file is not corrupted',
                   'For PDFs, ensure they contain selectable text'
                 ]
               }
             }, { status: 400 });
           }
      
    } catch (ocrError) {
      console.error('❌ Google Vision OCR failed:', ocrError);
      
      // Enhanced error logging
      if (ocrError instanceof Error) {
        console.error('📋 Error details:', {
          name: ocrError.name,
          message: ocrError.message,
          stack: ocrError.stack
        });
      }
      
      // Check for specific Google Vision API errors
      if (ocrError && typeof ocrError === 'object' && 'code' in ocrError) {
        const errorCode = (ocrError as any).code;
        console.error('🔍 Google Vision API error code:', errorCode);
        
        // Provide specific error messages for common issues
        let userMessage = 'Google Vision OCR processing failed';
        let statusCode = 500;
        
        switch (errorCode) {
          case 3:
            userMessage = 'Invalid argument provided to Google Vision API';
            statusCode = 400;
            break;
          case 7:
            userMessage = 'Permission denied - check Google Vision API credentials';
            statusCode = 403;
            break;
          case 8:
            userMessage = 'Resource exhausted - Google Vision API quota exceeded';
            statusCode = 429;
            break;
          case 13:
            userMessage = 'Internal error in Google Vision API';
            statusCode = 500;
            break;
          case 14:
            userMessage = 'Google Vision API service unavailable';
            statusCode = 503;
            break;
          default:
            userMessage = `Google Vision API error: ${errorCode}`;
        }
        
        return NextResponse.json({
          error: userMessage,
          details: ocrError instanceof Error ? ocrError.message : 'Unknown error',
          errorCode: errorCode,
          filename: file.name,
          timestamp: new Date().toISOString()
        }, { status: statusCode });
      }
      
      return NextResponse.json({
        error: 'Google Vision OCR processing failed',
        details: ocrError instanceof Error ? ocrError.message : 'Unknown error',
        filename: file.name,
        timestamp: new Date().toISOString(),
        suggestion: 'Please check the file format and try again. If the issue persists, contact support.'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ OCR proxy error:', error);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('📋 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { 
        error: 'OCR processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}
