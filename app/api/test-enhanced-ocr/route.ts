import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  console.log('🧪 Testing Enhanced OCR System');
  
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ 
        success: false,
        error: 'No file provided' 
      }, { status: 400 });
    }
    
    console.log(`📄 Testing OCR on file: ${file.name} (${file.size} bytes, ${file.type})`);
    
    // Test the enhanced OCR function
    const result = await performOCR(file);
    
    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        type: file.type
      },
      ocr: {
        text: result.text,
        textLength: result.text.length,
        hasContent: result.text.length > 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Enhanced OCR test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'OCR processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function performOCR(file: File): Promise<{ text: string }> {
  console.log("🔍 Performing enhanced OCR with fallback system...");
  
  // Try external OCR server first
  try {
    console.log("📡 Trying external OCR server...");
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'BlocIQ-OCR-Client/1.0'
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ External OCR processing completed");
      return { text: result.text || '' };
    } else {
      console.warn(`⚠️ External OCR failed with status ${response.status}`);
      throw new Error(`External OCR failed: ${response.status}`);
    }
  } catch (externalError) {
    console.warn("⚠️ External OCR failed, trying OpenAI Vision fallback...", externalError);
  }

  // Fallback to OpenAI Vision API
  if (process.env.OPENAI_API_KEY && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
    try {
      console.log("🤖 Using OpenAI Vision API fallback...");
      
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
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
                  text: 'Extract all text from this document. Focus on dates, names, certificate numbers, and any compliance-related information. Return only the text content, no explanations.'
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
        const result = await openAIResponse.json();
        const extractedText = result.choices?.[0]?.message?.content || '';
        console.log("✅ OpenAI Vision OCR completed");
        return { text: extractedText };
      } else {
        throw new Error(`OpenAI Vision API failed: ${openAIResponse.status}`);
      }
    } catch (openaiError) {
      console.error("❌ OpenAI Vision fallback failed:", openaiError);
    }
  }

  console.warn("⚠️ All OCR methods failed, returning empty text");
  return { text: '' };
}