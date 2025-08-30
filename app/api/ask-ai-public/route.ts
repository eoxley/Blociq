import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      prompt: userPrompt,
      question, // Keep for backward compatibility
    } = body;

    const actualQuestion = userPrompt || question;

    if (!actualQuestion) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    console.log('🤖 Public AI request:', actualQuestion.substring(0, 100) + '...');

    // Create a simple prompt for general property management questions
    const systemPrompt = `You are BlocIQ, a helpful AI assistant for UK property management. 
    
Provide helpful, accurate advice about property management, compliance, tenant relations, maintenance, and general property-related topics. 
Keep responses concise, professional, and practical. If you don't have specific information, provide general guidance.`;

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: actualQuestion }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'No response generated';

    console.log('✅ Public AI response generated');

    return NextResponse.json({ 
      success: true,
      result: aiResponse,
      context_type: 'public',
    });

  } catch (error) {
    console.error('❌ Error in public ask-ai route:', error);
    return NextResponse.json({ 
      error: 'Failed to process AI request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 