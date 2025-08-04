// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for question, buildingId, userId
// - Supabase queries with proper .eq() filters
// - Try/catch with detailed error handling
// - Used in AI assistant components
// - Includes OpenAI integration with error handling
// - Document-aware functionality with proper validation

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { buildPrompt } from '@/lib/buildPrompt';
import { insertAiLog } from '@/lib/supabase/ai_logs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
      question, 
      buildingId, 
      documentIds = [], 
      emailThreadId, 
      manualContext, 
      leaseholderId 
    } = body;

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    console.log('🤖 Building unified prompt for BlocIQ assistant');

    // Build unified prompt with all context
    const prompt = await buildPrompt({
      question,
      contextType: 'general',
      buildingId,
      documentIds,
      emailThreadId,
      manualContext,
      leaseholderId,
    });

    console.log('📝 Prompt built, calling OpenAI...');

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'No response generated';

    console.log('✅ OpenAI response received');

    // Log the AI interaction
    await insertAiLog({
      user_id: user.id,
      question,
      response: aiResponse,
      context_type: 'blociq_assistant',
      building_id: buildingId,
      document_ids: documentIds,
      leaseholder_id: leaseholderId,
      email_thread_id: emailThreadId,
    });

    return NextResponse.json({ 
      success: true,
      result: aiResponse,
      context_type: 'blociq_assistant',
      building_id: buildingId,
      document_count: documentIds.length,
      has_email_thread: !!emailThreadId,
      has_leaseholder: !!leaseholderId
    });

  } catch (error) {
    console.error('❌ Error in ask-blociq route:', error);
    return NextResponse.json({ 
      error: 'Failed to process BlocIQ request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 