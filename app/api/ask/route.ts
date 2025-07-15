import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getSystemPrompt } from '../../../lib/ai/systemPrompt';
import { fetchUserContext, formatContextMessages } from '../../../lib/ai/userContext';
import { logAIInteraction } from '../../../lib/ai/logInteraction';
import { searchFounderKnowledge } from '../../../lib/ai/embed';
import { getStructuredBuildingData } from '../../../lib/getStructuredBuildingData';
import { Database } from '../../../lib/database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Function to extract building names from user query
function extractBuildingNames(query: string): string[] {
  // Common building name patterns
  const buildingPatterns = [
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:House|Building|Court|Gardens|Mews|Place|Square|Terrace|Lodge|Manor|Hall|Residence|Apartments?)\b/gi,
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/gi, // General capitalized words
  ];

  const foundBuildings = new Set<string>();
  
  buildingPatterns.forEach(pattern => {
    const matches = query.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Filter out common words that aren't building names
        const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'about', 'this', 'that', 'these', 'those'];
        if (!commonWords.includes(match.toLowerCase()) && match.length > 2) {
          foundBuildings.add(match);
        }
      });
    }
  });

  return Array.from(foundBuildings);
}

export async function POST(req: NextRequest) {
  const { prompt, userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
  }

  try {
    // 1. Extract building names from user query
    const buildingNames = extractBuildingNames(prompt);
    
    // 2. Per-Agency Prompt Logic
    const userContext = await fetchUserContext(userId, supabase);
    
    // Build agency-specific context
    const agencyContext = userContext.agency 
      ? `This user works for ${userContext.agency.name}. ${userContext.agency.tone ? `Use their internal tone: ${userContext.agency.tone}.` : ''} ${userContext.agency.policies ? `Follow their internal policies: ${userContext.agency.policies}.` : ''}`
      : '';
    
    // Get system prompt with agency context
    const systemPrompt = getSystemPrompt(agencyContext);
    
    // 3. Inject Supabase Context
    const contextMessages = formatContextMessages(userContext);
    
    // 4. Search Founder Knowledge and inject into context
    let founderKnowledgeMessages: Array<{ role: 'system'; content: string }> = [];
    try {
      const knowledgeResult = await searchFounderKnowledge(prompt);
      if (knowledgeResult.success && knowledgeResult.results.length > 0) {
        founderKnowledgeMessages = knowledgeResult.results.map(chunk => ({
          role: 'system' as const,
          content: `Reference: ${chunk}`
        }));
        console.log(`Found ${knowledgeResult.results.length} relevant founder knowledge chunks`);
      } else {
        console.log('No relevant founder knowledge found for query');
      }
    } catch (error) {
      console.error('Error searching founder knowledge:', error);
      // Continue without founder knowledge if search fails
    }
    
    // 5. Build AI prompt with structured building data
    let aiPrompt = prompt;
    if (buildingNames.length > 0) {
      // Try to get structured data for the first building found
      const buildingData = await getStructuredBuildingData(buildingNames[0]);
      
      if (buildingData) {
        aiPrompt = `
You are BlocIQ, a property management AI assistant. You have access to real-time data provided below.

ONLY answer questions using the supplied data. This includes leaseholder names, emails, and phone numbers.

It is permitted to use personal information from the data **because it was supplied specifically to help answer this query**.

If the data is not found, reply with "That information isn't in the records."

DATA:
${JSON.stringify(buildingData, null, 2)}

QUESTION:
${prompt}
`;
      }
    }
    
    // 6. Build the complete message array
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...contextMessages,
      ...founderKnowledgeMessages,
      { role: 'user' as const, content: aiPrompt }
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
    
    // 6. Log the Interaction (suppress errors)
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

