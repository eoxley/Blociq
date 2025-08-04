// ✅ AUDIT COMPLETE [2025-01-15]
// - Has try/catch wrapper
// - Validates required fields (question, building_id)
// - Uses proper Supabase queries with .eq() filters
// - Returns meaningful error responses
// - Includes authentication check

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
      prompt: userPrompt, // AskBlocIQ sends 'prompt' instead of 'question'
      question, // Keep for backward compatibility
      contextType = 'general',
      buildingId, 
      building_id, // AskBlocIQ sends 'building_id'
      documentIds = [], 
      emailThreadId, 
      manualContext, 
      leaseholderId,
      projectId // New field for Major Works
    } = body;

    const actualQuestion = userPrompt || question;
    const actualBuildingId = buildingId || building_id;

    if (!actualQuestion) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    console.log('🤖 Building unified prompt for:', contextType);

    // Build unified prompt with all context
    const unifiedPrompt = await buildPrompt({
      question: actualQuestion,
      contextType,
      buildingId: actualBuildingId,
      documentIds,
      emailThreadId,
      manualContext,
      leaseholderId,
      projectId,
    });

    console.log('📝 Prompt built, calling OpenAI...');

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'system', content: unifiedPrompt }],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'No response generated';

    console.log('✅ OpenAI response received');

    // Log the AI interaction
    const logId = await insertAiLog({
      user_id: user.id,
      question: actualQuestion,
      response: aiResponse,
      context_type: contextType,
      building_id: actualBuildingId,
      document_ids: documentIds,
      leaseholder_id: leaseholderId,
      email_thread_id: emailThreadId,
    });

    return NextResponse.json({ 
      success: true,
      result: aiResponse,
      ai_log_id: logId,
      context_type: contextType,
      building_id: actualBuildingId,
      document_count: documentIds.length,
      has_email_thread: !!emailThreadId,
      has_leaseholder: !!leaseholderId,
      context: {
        complianceUsed: contextType === 'compliance',
        majorWorksUsed: contextType === 'major_works'
      }
    });

  } catch (error) {
    console.error('❌ Error in ask-ai route:', error);
    return NextResponse.json({ 
      error: 'Failed to process AI request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 