import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getSystemPrompt } from '../../../lib/ai/systemPrompt';
import { fetchUserContext, formatContextMessages } from '../../../lib/ai/userContext';
import { logAIInteraction } from '../../../lib/ai/logInteraction';
import { searchFounderKnowledge } from '../../../lib/ai/embed';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  const { prompt, userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
  }

  try {
    // 1. Per-Agency Prompt Logic
    const userContext = await fetchUserContext(userId, supabase);
    
    // Build agency-specific context
    const agencyContext = userContext.agency 
      ? `This user works for ${userContext.agency.name}. ${userContext.agency.tone ? `Use their internal tone: ${userContext.agency.tone}.` : ''} ${userContext.agency.policies ? `Follow their internal policies: ${userContext.agency.policies}.` : ''}`
      : '';
    
    // Get system prompt with agency context
    const systemPrompt = getSystemPrompt(agencyContext);
    
    // 2. Inject Supabase Context
    const contextMessages = formatContextMessages(userContext);
    
    // 3. Search Founder Knowledge and inject into context
    let founderKnowledgeMessages: Array<{ role: 'system'; content: string }> = [];
    try {
      const knowledgeChunks = await searchFounderKnowledge(prompt);
      if (knowledgeChunks.length > 0) {
        founderKnowledgeMessages = knowledgeChunks.map(chunk => ({
          role: 'system' as const,
          content: `Reference: ${chunk}`
        }));
        console.log(`Found ${knowledgeChunks.length} relevant founder knowledge chunks`);
      } else {
        console.log('No relevant founder knowledge found for query');
      }
    } catch (error) {
      console.error('Error searching founder knowledge:', error);
      // Continue without founder knowledge if search fails
    }
    
    // 4. Build the complete message array with founder knowledge
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...contextMessages,
      ...founderKnowledgeMessages,
      { role: 'user' as const, content: prompt }
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.3,
      max_tokens: 1000
    });

    const answer = completion.choices[0].message.content;
    
    if (!answer) {
      throw new Error('No response from OpenAI');
    }
    
    // 5. Log the Interaction (suppress errors)
    try {
      await logAIInteraction({
        user_id: userId,
        agency_id: userContext.agency?.id,
        question: prompt,
        response: answer,
        timestamp: new Date().toISOString(),
      }, supabase);
    } catch (logError) {
      // Suppress logging errors so they don't break the main flow
      console.error('Failed to log AI interaction:', logError);
    }

    return NextResponse.json({ answer });
  } catch (err) {
    console.error('BlocIQ AI error:', err);
    return NextResponse.json({ 
      error: 'AI failed to respond',
      details: process.env.NODE_ENV === 'development' ? err instanceof Error ? err.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
}
