import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  console.log('🔧 CORS Proxy: Handling OCR request to external server');

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
    
    console.log(`📄 CORS Proxy: Processing file: ${file.name} (${file.size} bytes)`);

    // Try external OCR server first
    try {
      console.log('📡 CORS Proxy: Trying external OCR server...');
      
      const ocrResponse = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'User-Agent': 'BlocIQ-OCR-Client/1.0'
        },
      });

      console.log('📡 CORS Proxy: OCR server response status:', ocrResponse.status);

      if (ocrResponse.ok) {
        const result = await ocrResponse.json();
        console.log('✅ CORS Proxy: External OCR processing successful');

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
      } else {
        console.warn(`⚠️ CORS Proxy: External OCR failed with status ${ocrResponse.status}`);
        throw new Error(`External OCR failed: ${ocrResponse.status}`);
      }
    } catch (externalError) {
      console.warn('⚠️ CORS Proxy: External OCR failed, trying OpenAI Vision fallback...', externalError);
    }

    // Fallback to OpenAI Vision API
    if (process.env.OPENAI_API_KEY && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      try {
        console.log('🤖 CORS Proxy: Using OpenAI Vision API fallback...');
        console.log(`📄 File type: ${file.type}, Size: ${file.size} bytes`);
        
        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        // Enhanced prompt for better text extraction
        const extractionPrompt = file.type === 'application/pdf' 
          ? 'Extract all text from this PDF document. Focus on any dates, names, addresses, numbers, and important information. Return only the text content, preserving structure when possible.'
          : 'Extract all text from this image/document. Focus on any dates, names, addresses, numbers, and important information. Return only the text content, preserving structure when possible.';
        
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
        });
        
        if (openAIResponse.ok) {
          const openAIResult = await openAIResponse.json();
          const extractedText = openAIResult.choices?.[0]?.message?.content || '';
          
          console.log(`✅ CORS Proxy: OpenAI Vision API successful - extracted ${extractedText.length} characters`);
          
          return NextResponse.json({
            text: extractedText,
            source: 'openai_vision',
            success: true,
            metadata: {
              fileType: file.type,
              fileSize: file.size,
              extractedLength: extractedText.length
            }
          }, {
            status: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            }
          });
        } else {
          const errorText = await openAIResponse.text();
          console.error(`❌ CORS Proxy: OpenAI Vision failed (${openAIResponse.status}):`, errorText);
          throw new Error(`OpenAI Vision API failed: ${openAIResponse.status} - ${errorText}`);
        }
      } catch (openAIError) {
        console.error('❌ CORS Proxy: OpenAI Vision error:', openAIError);
      }
    } else {
      console.warn('⚠️ CORS Proxy: OpenAI API key not configured or unsupported file type, skipping OpenAI Vision fallback');
      console.log(`📄 File type: ${file.type}, OpenAI key configured: ${!!process.env.OPENAI_API_KEY}`);
    }

    // If both methods fail, return partial success with metadata
    console.warn('⚠️ All OCR methods failed, returning fallback response');
    return NextResponse.json({
      success: false,
      text: '',
      source: 'failed',
      error: 'OCR processing failed',
      metadata: {
        fileType: file.type,
        fileSize: file.size,
        fileName: file.name,
        availableMethods: [
          `External OCR: ${process.env.OPENAI_API_KEY ? 'Available' : 'Unavailable'}`,
          `OpenAI Vision: ${process.env.OPENAI_API_KEY ? 'Available' : 'Unavailable'} (supports images and PDFs)`
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