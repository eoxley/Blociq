import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    console.log('🔌 Outlook Add-in API endpoint hit');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      console.log('❌ Authentication failed for add-in request');
      return NextResponse.json({ 
        action: 'login_required',
        message: 'Authentication required. Please log into your BlocIQ account.',
        error: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    console.log('✅ User authenticated:', session.user.id);

    const body = await req.json();
    const { prompt, contextType, building_id, emailContext, is_outlook_addin } = body;

    if (!prompt) {
      return NextResponse.json({ 
        error: 'Prompt is required',
        message: 'Please provide a question or prompt.'
      }, { status: 400 });
    }

    console.log('📝 Processing add-in request:', {
      prompt: prompt.substring(0, 100) + '...',
      contextType,
      building_id: building_id || 'none',
      hasEmailContext: !!emailContext,
      is_outlook_addin
    });

    // Build context for the AI
    let context = `You are BlocIQ Assistant, an AI-powered property management assistant. `;
    
    if (building_id) {
      // Get building information if provided
      const { data: building } = await supabase
        .from('buildings')
        .select('name, address, type')
        .eq('id', building_id)
        .single();
      
      if (building) {
        context += `\n\nBuilding Context: ${building.name} - ${building.address} (${building.type})`;
      }
    }

    if (emailContext) {
      context += `\n\nEmail Context:\nSubject: ${emailContext.subject}\nFrom: ${emailContext.from}\nTo: ${emailContext.to}\nBody: ${emailContext.body.substring(0, 500)}...`;
    }

    context += `\n\nUser Question: ${prompt}\n\nPlease provide a helpful, professional response suitable for property management professionals.`;

    // Generate AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: context
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response. Please try again.';

    console.log('✅ AI response generated successfully');

    return NextResponse.json({
      success: true,
      response: response,
      contextType,
      building_id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Add-in API error:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  // Handle preflight request for CORS
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://outlook.office.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
