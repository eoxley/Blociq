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
      leaseholderId,
      draftType = 'email' // email, letter, notice, etc.
    } = body;

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    console.log('🤖 Building unified prompt for draft generation:', draftType);

    // Build unified prompt with all context
    const prompt = await buildPrompt({
      question,
      contextType: 'draft_generation',
      buildingId,
      documentIds,
      emailThreadId,
      manualContext,
      leaseholderId,
    });

    // Add draft-specific instructions
    const draftInstructions = `
IMPORTANT: You are generating a ${draftType} draft. Please:

1. Use professional, courteous British English
2. Format as a proper ${draftType} with appropriate structure
3. Include all necessary details from the context
4. Use formal language appropriate for property management
5. Include relevant dates, names, and specific information
6. If this is a response to an email, maintain the conversation flow
7. If this is a notice or letter, use appropriate legal language
8. Always be helpful and solution-oriented

Generate the ${draftType} draft now:
`;

    const finalPrompt = prompt + '\n\n' + draftInstructions;

    console.log('📝 Prompt built, calling OpenAI...');

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'system', content: finalPrompt }],
      temperature: 0.4,
      max_tokens: 2000,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'No draft generated';

    console.log('✅ OpenAI response received');

    // Log the AI interaction
    await insertAiLog({
      user_id: user.id,
      question,
      response: aiResponse,
      context_type: `draft_generation_${draftType}`,
      building_id: buildingId,
      document_ids: documentIds,
      leaseholder_id: leaseholderId,
      email_thread_id: emailThreadId,
    });

    return NextResponse.json({ 
      success: true,
      draft: aiResponse,
      draft_type: draftType,
      context_type: `draft_generation_${draftType}`,
      building_id: buildingId,
      document_count: documentIds.length,
      has_email_thread: !!emailThreadId,
      has_leaseholder: !!leaseholderId
    });

  } catch (error) {
    console.error('❌ Error in generate-draft route:', error);
    return NextResponse.json({ 
      error: 'Failed to generate draft',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
