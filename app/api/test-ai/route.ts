import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Force deployment - timestamp: 2025-01-15 15:30
export async function GET() {
  try {
    console.log("🧪 Test AI endpoint called");
    
    // Check environment variables
    const envVars = {
      openaiKey: !!process.env.OPENAI_API_KEY,
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
    
    console.log("🔧 Environment variables check:", envVars);
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key missing',
        envVars 
      }, { status: 500 });
    }
    
    // Test OpenAI connection
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "Hello from BlocIQ test!"' }
        ],
        max_tokens: 50
      });
      
      const answer = response.choices[0].message.content;
      
      return NextResponse.json({ 
        success: true,
        message: answer,
        envVars,
        model: 'gpt-4o'
      });
      
    } catch (openaiError: any) {
      console.error("❌ OpenAI API error:", openaiError);
      return NextResponse.json({ 
        error: 'OpenAI API failed',
        details: openaiError.message,
        envVars 
      }, { status: 500 });
    }
    
  } catch (err: any) {
    console.error("❌ Test endpoint error:", err);
    return NextResponse.json({ 
      error: 'Test failed',
      details: err.message 
    }, { status: 500 });
  }
} 