import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for OCR processing

export async function POST(req: NextRequest) {
  console.log('🔧 CORS Proxy: Handling OCR request to external server');
  
  // Set a reasonable timeout for the entire request
  const startTime = Date.now();
  const REQUEST_TIMEOUT = 180000; // 3 minutes to match Render service limits
  
  // API Key verification logging
  console.log('🔑 API Key check:', {
    openAI: {
      exists: !!process.env.OPENAI_API_KEY,
      length: process.env.OPENAI_API_KEY?.length,
      firstChars: process.env.OPENAI_API_KEY?.substring(0, 10)
    },
    googleVision: {
      credentialsFile: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      credentialsJson: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      individualVars: !!(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_PROJECT_ID)
    }
  });

  try {
    // Get the form data from the request
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error('❌ CORS Proxy: No file provided');
      return NextResponse.json({ 
        success: false,
        error: 'No file provided' 
      }, { status: 400 });
    }
    
    // Enhanced file info logging
    console.log('📁 File info:', {
      name: file.name,
      size: file.size,
      type: file.type,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
    });
    
    // File size checks
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB limit for most OCR services
    const MAX_OPENAI_SIZE = 100 * 1024 * 1024; // 100MB limit for OpenAI
    
    if (file.size > MAX_OPENAI_SIZE) {
      console.error('❌ File too large for all OCR services');
      return NextResponse.json({
        success: false,
        error: 'File too large for OCR processing',
        metadata: {
          fileSize: file.size,
          maxSize: MAX_OPENAI_SIZE,
          fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
          maxSizeMB: (MAX_OPENAI_SIZE / (1024 * 1024)).toFixed(2)
        }
      }, { status: 413 }); // Payload Too Large
    }
    
    if (file.size > MAX_FILE_SIZE) {
      console.warn('⚠️ File larger than external OCR limit, will skip external OCR and use OpenAI only');
    }

    // Helper function to retry with exponential backoff
    const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Check timeout before each attempt
          if (Date.now() - startTime > REQUEST_TIMEOUT) {
            throw new Error('Request timeout exceeded');
          }
          
          return await fn();
        } catch (error) {
          if (attempt === maxRetries) throw error;
          
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
          console.log(`⏰ Retry attempt ${attempt} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };

    // Try external OCR server first (only if file size is acceptable)
    if (file.size <= MAX_FILE_SIZE) {
      try {
        console.log('📡 CORS Proxy: Trying external OCR server...');
        
        const result = await retryWithBackoff(async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout per attempt to allow Render service to complete
          
          try {
            // Manually construct multipart data with proper CR/LF boundaries
            const originalFile = formData.get('file') as File;
            if (!originalFile) {
              throw new Error('No file found in form data');
            }
            
            console.log('📤 Sending to external OCR:', {
              fileName: originalFile?.name,
              fileSize: originalFile?.size,
              fileType: originalFile?.type
            });
            
            // Generate a proper boundary
            const boundary = '----formdata-blociq-' + Math.random().toString(36).substring(2);
            
            // Get file data
            const fileBuffer = await originalFile.arrayBuffer();
            
            // Construct multipart body with proper CR/LF line endings
            const textEncoder = new TextEncoder();
            const CRLF = '\r\n';
            
            // Build the multipart body parts with strict RFC 2046 compliance
            const bodyStart = textEncoder.encode([
              `--${boundary}${CRLF}`,
              `Content-Disposition: form-data; name="file"; filename="${originalFile.name}"${CRLF}`,
              `Content-Type: ${originalFile.type}${CRLF}`,
              `${CRLF}`
            ].join(''));
            
            // Closing boundary must have CRLF before the boundary and after the final --
            const bodyEnd = textEncoder.encode(`${CRLF}--${boundary}--${CRLF}`);
            
            // Combine all parts
            const bodyArray = new Uint8Array(bodyStart.length + fileBuffer.byteLength + bodyEnd.length);
            bodyArray.set(bodyStart, 0);
            bodyArray.set(new Uint8Array(fileBuffer), bodyStart.length);
            bodyArray.set(bodyEnd, bodyStart.length + fileBuffer.byteLength);
            
            const ocrResponse = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
              method: 'POST',
              headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`
              },
              body: bodyArray,
              signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log('📡 CORS Proxy: OCR server response status:', ocrResponse.status);

            if (ocrResponse.ok) {
              const result = await ocrResponse.json();
              console.log('✅ CORS Proxy: External OCR processing successful');
              return result;
            } else {
              const errorText = await ocrResponse.text().catch(() => 'No error text available');
              console.error(`❌ External OCR failed: ${ocrResponse.status}`, errorText);
              throw new Error(`External OCR failed: ${ocrResponse.status} - ${errorText}`);
            }
          } finally {
            clearTimeout(timeoutId);
          }
        });

        return NextResponse.json({
          ...result,
          source: 'external_ocr'
        }, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        });
      } catch (externalError) {
        console.warn('⚠️ CORS Proxy: External OCR failed after retries, trying OpenAI Vision fallback...', externalError);
        console.error('❌ External OCR Error details:', {
          message: externalError instanceof Error ? externalError.message : 'Unknown error',
          name: externalError instanceof Error ? externalError.name : 'Unknown',
          stack: externalError instanceof Error ? externalError.stack : 'No stack trace'
        });
      }
    } else {
      console.log('📏 Skipping external OCR due to file size limit');
    }

    // Fallback to OpenAI Vision API
    console.log('🔍 OpenAI Vision check:', {
      hasApiKey: !!process.env.OPENAI_API_KEY,
      fileType: file.type,
      isImageOrPdf: (file.type.startsWith('image/') || file.type === 'application/pdf')
    });
    
    if (process.env.OPENAI_API_KEY && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      try {
        console.log('🤖 CORS Proxy: Using OpenAI Vision API fallback...');
        console.log(`📄 File type: ${file.type}, Size: ${file.size} bytes`);
        
        // Check timeout before expensive operations
        if (Date.now() - startTime > REQUEST_TIMEOUT) {
          throw new Error('Request timeout exceeded before OpenAI processing');
        }
        
        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        // Enhanced prompt for better text extraction
        const extractionPrompt = file.type === 'application/pdf' 
          ? 'Extract all text from this PDF document. Focus on any dates, names, addresses, numbers, and important information. Return only the text content, preserving structure when possible.'
          : 'Extract all text from this image/document. Focus on any dates, names, addresses, numbers, and important information. Return only the text content, preserving structure when possible.';
        
        const result = await retryWithBackoff(async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for OpenAI Vision
          
          try {
            const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                  {
                    role: 'user',
                    content: [
                      {
                        type: 'text',
                        text: extractionPrompt
                      },
                      {
                        type: 'image_url',
                        image_url: {
                          url: `data:${file.type};base64,${base64}`,
                          detail: 'high'
                        }
                      }
                    ]
                  }
                ],
                max_tokens: 4000,
                temperature: 0
              }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!openAIResponse.ok) {
              const errorText = await openAIResponse.text();
              let errorMessage = `OpenAI Vision API failed: ${openAIResponse.status}`;
              if (openAIResponse.status === 429) {
                errorMessage += ' - Rate limit exceeded';
              } else if (openAIResponse.status === 401) {
                errorMessage += ' - Invalid API key';
              } else if (openAIResponse.status === 413) {
                errorMessage += ' - File too large';
              }
              throw new Error(`${errorMessage} - ${errorText}`);
            }
            
            return await openAIResponse.json();
          } finally {
            clearTimeout(timeoutId);
          }
        });
        
        const extractedText = result.choices?.[0]?.message?.content || '';
        
        console.log(`✅ CORS Proxy: OpenAI Vision API successful - extracted ${extractedText.length} characters`);
        
        // Additional validation
        if (!extractedText || extractedText.length === 0) {
          console.warn('⚠️ OpenAI returned empty text');
        }
        
        return NextResponse.json({
          text: extractedText,
          source: 'openai_vision',
          success: true,
          metadata: {
            fileType: file.type,
            fileSize: file.size,
            fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
            extractedLength: extractedText.length,
            model: 'gpt-4o',
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime
          }
        }, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        });
      } catch (openAIError) {
        console.error('❌ CORS Proxy: OpenAI Vision error:', openAIError);
        console.error('❌ OpenAI Error details:', {
          message: openAIError instanceof Error ? openAIError.message : 'Unknown error',
          stack: openAIError instanceof Error ? openAIError.stack : 'No stack trace'
        });
      }
    } else {
      console.warn('⚠️ CORS Proxy: OpenAI API key not configured or unsupported file type, skipping OpenAI Vision fallback');
      console.log(`📄 File type: ${file.type}, OpenAI key configured: ${!!process.env.OPENAI_API_KEY}`);
    }

    // If both methods fail, return user-friendly explanation
    console.warn('⚠️ All OCR methods failed, returning user-friendly response');
    const isLargeFile = file.size > 2 * 1024 * 1024; // 2MB threshold
    const userMessage = isLargeFile 
      ? 'Large document processing is taking longer than expected. This may be due to high server load or the document complexity. Please try again in a few minutes, or consider breaking the document into smaller sections.'
      : 'Document processing failed. This may be due to document format or temporary service issues. Please try uploading the document again.';
      
    return NextResponse.json({
      success: false,
      text: '',
      source: 'timeout',
      error: userMessage,
      metadata: {
        fileType: file.type,
        fileSize: file.size,
        fileName: file.name,
        fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
        isLargeFile,
        suggestion: isLargeFile 
          ? 'Try breaking the document into smaller sections or wait a few minutes before retrying.'
          : 'Please check the document format and try uploading again.',
        availableMethods: [
          `External OCR: Timeout after 5 minutes`,
          `OpenAI Vision: ${process.env.OPENAI_API_KEY ? 'Available but timed out' : 'Not configured'}`
        ]
      }
    }, {
      status: 422, // Unprocessable Entity instead of 500
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('❌ CORS Proxy: Error processing OCR request:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process OCR request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}