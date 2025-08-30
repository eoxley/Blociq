import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // ✅ SECURE: Handle both FormData and JSON without OCR access
    const contentType = req.headers.get('content-type') || '';
    console.log('Request content-type:', contentType);
    
    let prompt: string;
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData from homepage
      console.log('✅ Processing FormData request from homepage');
      const formData = await req.formData();
      prompt = formData.get('prompt') as string;
      
      // Note: Files are ignored for security - no OCR processing in public route
      const uploadedFiles = formData.getAll('files') as File[];
      if (uploadedFiles.length > 0) {
        console.log(`⚠️ Files ignored for security: ${uploadedFiles.length} files received`);
      }
      
    } else {
      // Handle JSON requests
      console.log('✅ Processing JSON request');
      const body = await req.json();
      prompt = body.prompt;
    }
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    console.log('📝 Processing prompt:', prompt.substring(0, 100) + '...');
    
    // 🤖 Send to AI service (no OCR processing)
    const aiResponse = await fetch(process.env.AI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_API_KEY || process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are BlocIQ AI, a helpful assistant for property management questions. Provide helpful, accurate advice about property management, compliance, tenant relations, and general property topics.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7
      })
    });
    
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('🤖 AI service error:', aiResponse.status, errorText);
      throw new Error(`AI service error: ${aiResponse.status}`);
    }
    
    const aiResult = await aiResponse.json();
    
    // 📊 Return secure response (no OCR data)
    return NextResponse.json({
      response: aiResult.choices?.[0]?.message?.content || aiResult.response || 'No response generated',
      success: true,
      note: 'This is a secure public endpoint with no OCR access'
    });
    
  } catch (error) {
    console.error('💥 Ask AI Public API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    );
  }
} 