import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Processing OCR request with Google Vision directly');
    console.log('📊 Request headers:', Object.fromEntries(request.headers.entries()));
    
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
      
      // Use Google Vision OCR directly on server-side
      console.log('🔧 Importing ocrFallback function...');
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
