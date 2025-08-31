import { NextRequest, NextResponse } from 'next/server';

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    console.log('> OpenAI OCR: Processing image with OpenAI Vision...');
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('L OpenAI OCR: API key not configured');
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        success: false 
      }, { status: 500 });
    }
    
    // Get the uploaded file from FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error('L OpenAI OCR: No file provided');
      return NextResponse.json({ 
        error: 'No file provided',
        success: false 
      }, { status: 400 });
    }
    
    console.log(`=Ä OpenAI OCR: Processing file: ${file.name} (${file.size} bytes)`);
    
    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    // Call OpenAI Vision API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // GPT-4 with vision
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this image. Return only the text content exactly as it appears, preserving formatting and line breaks where possible. Do not add any explanations, comments, or additional formatting.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${file.type};base64,${base64}`,
                  detail: 'high' // Use high detail for better OCR accuracy
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0 // Use deterministic output
      }),
    });
    
    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('L OpenAI OCR: API error:', errorText);
      
      let errorMessage = 'OpenAI API request failed';
      if (openAIResponse.status === 401) {
        errorMessage = 'Invalid OpenAI API key';
      } else if (openAIResponse.status === 429) {
        errorMessage = 'OpenAI API rate limit exceeded';
      } else if (openAIResponse.status === 400) {
        errorMessage = 'Invalid request to OpenAI API';
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: errorText,
        success: false 
      }, { status: openAIResponse.status });
    }
    
    const openAIResult = await openAIResponse.json();
    const extractedText = openAIResult.choices?.[0]?.message?.content || '';
    
    if (!extractedText.trim()) {
      console.warn('  OpenAI OCR: No text extracted from image');
      return NextResponse.json({
        text: '',
        message: 'No text found in the image',
        source: 'openai_vision',
        success: true
      });
    }
    
    console.log(' OpenAI OCR: Text extraction successful');
    console.log(`=Ý OpenAI OCR: Extracted ${extractedText.length} characters`);
    
    return NextResponse.json({
      text: extractedText,
      source: 'openai_vision',
      success: true,
      usage: openAIResult.usage || null
    });
    
  } catch (error) {
    console.error('L OpenAI OCR: Unexpected error:', error);
    return NextResponse.json({ 
      error: 'OCR processing failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}

// Handle preflight CORS requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}