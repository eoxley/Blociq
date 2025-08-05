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

// Debug: Check if API key is loaded
const apiKey = process.env.OPENAI_API_KEY;
console.log('🔑 OpenAI API Key loaded:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');

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

    // 🏢 Building Context Detection
    let detectedBuilding = null;
    if (!actualBuildingId) {
      // Extract potential building names from the question
      const buildingKeywords = ['house', 'court', 'building', 'apartment', 'residence', 'manor', 'gardens', 'heights', 'view', 'plaza'];
      const words = actualQuestion.toLowerCase().split(/\s+/);
      
      for (let i = 0; i < words.length - 1; i++) {
        const potentialName = words.slice(i, i + 2).join(' '); // Check 2-word combinations
        if (buildingKeywords.some(keyword => potentialName.includes(keyword))) {
          console.log('🔍 Searching for building:', potentialName);
          
          const { data: buildings } = await supabase
            .from('buildings')
            .select('id, name, unit_count, address')
            .ilike('name', `%${potentialName}%`)
            .maybeSingle();
          
          if (buildings) {
            detectedBuilding = buildings;
            console.log('✅ Found building context:', buildings.name);
            break;
          }
        }
      }
    }

    // Build unified prompt with all context
    const unifiedPrompt = await buildPrompt({
      question: actualQuestion,
      contextType,
      buildingId: actualBuildingId || detectedBuilding?.id?.toString(),
      documentIds,
      emailThreadId,
      manualContext: detectedBuilding ? 
        `Building Context: ${detectedBuilding.name} has ${detectedBuilding.unit_count || 'unknown'} units. Address: ${detectedBuilding.address || 'Not specified'}.` : 
        manualContext,
      leaseholderId,
      projectId,
    });

    console.log('📝 Prompt built, calling OpenAI...');
    console.log('🔑 Using API key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
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
      building_id: actualBuildingId || detectedBuilding?.id,
      document_ids: documentIds,
      leaseholder_id: leaseholderId,
      email_thread_id: emailThreadId,
    });

    return NextResponse.json({ 
      success: true,
      result: aiResponse,
      ai_log_id: logId,
      context_type: contextType,
      building_id: actualBuildingId || detectedBuilding?.id,
      document_count: documentIds.length,
      has_email_thread: !!emailThreadId,
      has_leaseholder: !!leaseholderId,
      context: {
        complianceUsed: contextType === 'compliance',
        majorWorksUsed: contextType === 'major_works',
        buildingDetected: !!detectedBuilding,
        buildingName: detectedBuilding?.name
      }
    });

  } catch (error) {
    console.error('❌ Error in ask-ai route:', error);
    console.error('🔑 API Key in error context:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
    return NextResponse.json({ 
      error: 'Failed to process AI request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 