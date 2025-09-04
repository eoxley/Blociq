import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // For Outlook add-ins, we need to handle authentication differently
    // Check for Authorization header or use public access with rate limiting
    const authHeader = request.headers.get('Authorization');
    
    // Try to get user from cookies first (for authenticated users)
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // If no user from cookies and no auth header, provide limited public access
    if ((!user || authError) && !authHeader) {
      console.log('⚠️ No authentication found, providing limited public access');
      return await handlePublicRequest(request);
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

// Handle public requests (for Outlook add-ins without full authentication)
async function handlePublicRequest(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, emailContext } = body;

    if (!prompt) {
      return NextResponse.json({
        error: 'Prompt is required'
      }, { status: 400 });
    }

    // Build a basic prompt for public access
    let enhancedPrompt = `You are BlocIQ AI, a property management assistant integrated with Microsoft Outlook.

Email Context:
- Subject: ${emailContext?.subject || 'N/A'}
- From: ${emailContext?.from || 'N/A'}

User Question: ${prompt}

Please provide a helpful, professional response related to property management, compliance, or email communication.`;

    // Call OpenAI with basic access
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are BlocIQ AI, a property management assistant. Provide professional, accurate advice for property managers and housing professionals. Keep responses concise and actionable.'
        },
        {
          role: 'user',
          content: enhancedPrompt
        }
      ],
      max_tokens: 500, // Limit for public access
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response from AI');
    }

    return NextResponse.json({
      response: response + '\n\n💡 *Sign in to BlocIQ for full database access and enhanced features.*',
      user: null,
      isPublicAccess: true
    });

  } catch (error) {
    console.error('[Public Ask AI] Error:', error);
    
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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}