import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'login_required',
        message: 'Please sign in to BlocIQ to use the AI assistant'
      }, { status: 401 });
    }

    const body = await request.json();
    const { 
      prompt, 
      contextType = 'general',
      building_id,
      emailContext 
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Get user's agency for context
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        agency_id,
        agencies (
          id,
          name,
          type
        )
      `)
      .eq('id', user.id)
      .single();

    // Build enhanced prompt with email context
    let enhancedPrompt = `You are BlocIQ AI, an expert property management assistant integrated with Microsoft Outlook.

User Context:
- Name: ${profile?.full_name || 'User'}
- Agency: ${profile?.agencies?.name || 'Unknown'}
- Email: ${user.email}`;

    if (emailContext) {
      enhancedPrompt += `

Current Email Context:
- Subject: ${emailContext.subject || 'N/A'}
- From: ${emailContext.from || 'N/A'}
- To: ${emailContext.to || 'N/A'}
- Body Preview: ${emailContext.bodyPreview ? emailContext.bodyPreview.substring(0, 500) + '...' : 'N/A'}`;
    }

    if (building_id) {
      // Get building context if provided
      const { data: building } = await supabase
        .from('buildings')
        .select('name, address, property_type')
        .eq('id', building_id)
        .eq('agency_id', profile?.agency_id)
        .single();

      if (building) {
        enhancedPrompt += `

Building Context:
- Name: ${building.name}
- Address: ${building.address}
- Type: ${building.property_type}`;
      }
    }

    enhancedPrompt += `

Context Type: ${contextType}

User Question: ${prompt}

Please provide a helpful, professional response as BlocIQ AI. If this relates to property management, compliance, or email communication, provide specific actionable advice.`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are BlocIQ AI, an expert property management assistant. Provide professional, accurate, and actionable advice for property managers, landlords, and housing professionals.'
        },
        {
          role: 'user',
          content: enhancedPrompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response from AI');
    }

    // Log the interaction
    await supabase
      .from('ai_interactions')
      .insert({
        user_id: user.id,
        prompt: prompt,
        response: response,
        context_type: contextType,
        building_id: building_id || null,
        metadata: {
          source: 'outlook_addin',
          email_context: emailContext || null,
          agency_id: profile?.agency_id || null
        }
      });

    return NextResponse.json({
      response,
      user: {
        name: profile?.full_name,
        agency: profile?.agencies?.name
      }
    });

  } catch (error) {
    console.error('[Addin Ask AI] Error:', error);
    
    return NextResponse.json({
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://blociq.co.uk',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}