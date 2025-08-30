import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenAI API key not found',
        message: 'Check your .env.local file'
      }, { status: 500 });
    }

    console.log('🔑 Testing OpenAI API key:', `${apiKey.substring(0, 10)}...`);

    const openai = new OpenAI({ apiKey });

    // Simple test call
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say "Hello, this is a test!"' }],
      max_tokens: 50,
    });

    const response = completion.choices[0]?.message?.content;

    return NextResponse.json({ 
      success: true,
      message: 'OpenAI API key is working!',
      response: response,
      apiKeyPrefix: apiKey.substring(0, 10)
    });

  } catch (error) {
    console.error('❌ OpenAI API test failed:', error);
    
    return NextResponse.json({ 
      error: 'OpenAI API test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      apiKeyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) : 'NOT FOUND'
    }, { status: 500 });
  }
} 