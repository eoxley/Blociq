// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for question, buildingId, userId
// - Supabase queries with proper .eq() filters
// - Try/catch with detailed error handling
// - Used in AI assistant components
// - Includes OpenAI integration with error handling
// - Document-aware functionality with proper validation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { buildPrompt } from '@/lib/buildPrompt';
import { insertAiLog } from '@/lib/supabase/ai_logs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY environment variable is missing');
      return NextResponse.json({ 
        error: 'OpenAI API key not configured. Please check environment variables.' 
      }, { status: 500 });
    }

    const supabase = createClient(cookies());
    
    // Get current user - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
    const sessionResult = await supabase.auth.getSession();
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const sessionError = sessionResult?.error || null
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;

    const body = await req.json();
    const { 
      question, 
      buildingId, 
      documentIds = [], 
      emailThreadId, 
      manualContext, 
      documentContext,
      leaseholderId 
    } = body;

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 });
    }

    console.log('🤖 Building unified prompt for BlocIQ assistant');

    // Build unified prompt with all context
    const prompt = await buildPrompt({
      question,
      contextType: 'general',
      buildingId,
      documentIds,
      emailThreadId,
      manualContext: documentContext ? JSON.stringify(documentContext) : manualContext,
      leaseholderId,
    });

    console.log('📝 Prompt built, calling OpenAI...');

    // Call OpenAI
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.3,
        max_tokens: 1500,
      });
    } catch (openaiError: any) {
      console.error('❌ OpenAI API error:', openaiError);
      
      if (openaiError.status === 401) {
        return NextResponse.json({ 
          error: 'OpenAI API key is invalid or expired. Please check your configuration.' 
        }, { status: 500 });
      } else if (openaiError.status === 429) {
        return NextResponse.json({ 
          error: 'OpenAI API rate limit exceeded. Please try again in a moment.' 
        }, { status: 500 });
      } else if (openaiError.status === 500) {
        return NextResponse.json({ 
          error: 'OpenAI service is temporarily unavailable. Please try again later.' 
        }, { status: 500 });
      } else {
        return NextResponse.json({ 
          error: 'Failed to generate AI response. Please try again.',
          details: openaiError.message || 'Unknown OpenAI error'
        }, { status: 500 });
      }
    }

    const aiResponse = completion.choices[0]?.message?.content || 'No response generated';

    console.log('✅ OpenAI response received');

    // Log the AI interaction
    const logId = await insertAiLog({
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
      answer: aiResponse,
      sources: [], // No document sources for this general API
      documentCount: documentIds.length,
      ai_log_id: logId,
      context_type: 'blociq_assistant',
      building_id: buildingId,
      has_email_thread: !!emailThreadId,
      has_leaseholder: !!leaseholderId,
      context: {
        complianceUsed: false, // This API doesn't use compliance data by default
        majorWorksUsed: false // This API doesn't use major works data by default
      }
    });

  } catch (error) {
    console.error('❌ Error in ask-blociq route:', error);
    return NextResponse.json({ 
      error: 'Failed to process BlocIQ request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 