import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getPromptEngine, AIMode, Tone } from '@/lib/ai/promptEngine';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      mode,
      input,
      threadId,
      tone,
      contextHints,
      emailData
    } = body;

    // Validate required fields
    if (!mode || !input) {
      return NextResponse.json({ 
        error: 'Missing required fields: mode and input are required' 
      }, { status: 400 });
    }

    // Validate mode
    const validModes: AIMode[] = ['ask', 'generate_reply', 'transform_reply', 'classify_document'];
    if (!validModes.includes(mode)) {
      return NextResponse.json({ 
        error: `Invalid mode. Must be one of: ${validModes.join(', ')}` 
      }, { status: 400 });
    }

    // Validate tone if provided
    if (tone) {
      const validTones: Tone[] = ['Holding', 'SolicitorFormal', 'ResidentNotice', 'SupplierRequest', 'CasualChaser'];
      if (!validTones.includes(tone)) {
        return NextResponse.json({ 
          error: `Invalid tone. Must be one of: ${validTones.join(', ')}` 
        }, { status: 400 });
      }
    }

    // Generate thread ID if not provided
    const finalThreadId = threadId || `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Run AI through the prompt engine
    const result = await getPromptEngine().runAI({
      mode,
      input,
      threadId: finalThreadId,
      tone,
      contextHints,
      emailData
    });

    // Log the interaction
    try {
      await supabase
        .from('ai_logs')
        .insert({
          user_id: user.id,
          question: input,
          response: result.content,
          building_id: contextHints?.building_id || null,
          context_type: mode,
          context_id: finalThreadId,
        });
    } catch (logError) {
      console.warn('Could not log AI interaction:', logError);
    }

    return NextResponse.json({
      success: true,
      ...result,
      thread_id: finalThreadId
    });

  } catch (error: any) {
    console.error('Error in unified AI route:', error);
    
    // Handle specific error types
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (error.message.includes('No previous draft found')) {
      return NextResponse.json({ 
        error: 'No previous draft found for transformation',
        details: 'Please generate a new email first before requesting transformations'
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'AI processing failed',
      details: error.message || 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Handle GET requests for health check
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    service: 'BlocIQ Unified AI Engine',
    version: '1.0.0',
    modes: ['ask', 'generate_reply', 'transform_reply', 'classify_document'],
    tones: ['Holding', 'SolicitorFormal', 'ResidentNotice', 'SupplierRequest', 'CasualChaser']
  });
}
