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

export async function POST(req: NextRequest) {
  try {
    console.log("🧠 Incoming assistant request to /api/ask");
    
    const body = await req.json();
    console.log("📨 Request body:", body);
    
    const { question, buildingId, userId } = body;

    if (!userId) {
      console.error("❌ No user ID provided in request");
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    if (!question) {
      console.error("❌ No question provided in request");
      return NextResponse.json({ error: 'Question required' }, { status: 400 });
    }

    if (!buildingId) {
      console.error("❌ No building ID provided in request");
      return NextResponse.json({ error: 'Building ID required' }, { status: 400 });
    }

    console.log("✅ Valid request received - Question:", question, "Building ID:", buildingId, "User ID:", userId);

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY environment variable is missing');
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    console.log("✅ OpenAI API key found");

    // 1. Get structured building data
    console.log("🔍 Getting structured building data for:", buildingId);
    const buildingData = await getStructuredBuildingData(buildingId);

    if (!buildingData) {
      console.error("❌ Building not found:", buildingId);
      return NextResponse.json({ error: 'Building not found.' }, { status: 404 });
    }

    console.log("✅ Building data retrieved:", buildingData.name);

    // 2. Per-Agency Prompt Logic
    console.log("👤 Fetching user context for user:", userId);
    const userContext = await fetchUserContext(userId, supabase);
    
    // Build building context
    const buildingContext = buildingData ? `
Building Information:
- Name: ${buildingData.name}
- Address: ${buildingData.address || 'Not specified'}
- Unit Count: ${buildingData.unit_count || 'Unknown'}
- Created: ${buildingData.created_at ? new Date(buildingData.created_at).toLocaleDateString() : 'Unknown'}
` : 'No building data available';
    
    console.log("🏢 Building context:", buildingContext);
    
    // Get system prompt with building context
    const systemPrompt = getSystemPrompt(buildingContext);
    
    // 3. Inject Supabase Context
    const contextMessages = formatContextMessages(userContext);
    console.log("📝 Context messages count:", contextMessages.length);
    
    // 4. Search Founder Knowledge and inject into context
    let founderKnowledgeMessages: Array<{ role: 'system'; content: string }> = [];
    try {
      console.log("🔍 Searching founder knowledge for:", question);
      const knowledgeResult = await searchFounderKnowledge(question);
      if (knowledgeResult.success && knowledgeResult.results.length > 0) {
        founderKnowledgeMessages = knowledgeResult.results.map(chunk => ({
          role: 'system' as const,
          content: `Reference: ${chunk}`
        }));
        console.log(`✅ Found ${knowledgeResult.results.length} relevant founder knowledge chunks`);
      } else {
        console.log('ℹ️ No relevant founder knowledge found for query');
      }
    } catch (error) {
      console.error('❌ Error searching founder knowledge:', error);
      // Continue without founder knowledge if search fails
    }
    
    // 5. Build AI prompt with building context
    const aiPrompt = `
You are BlocIQ, a property management AI assistant. You have access to the following building context:

${buildingContext}

Please answer the following question about this building:

QUESTION:
${question}
`;
    
    // 6. Build the complete message array
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...contextMessages,
      ...founderKnowledgeMessages,
      { role: 'user' as const, content: aiPrompt }
    ];

    console.log("🤖 Calling OpenAI API with", messages.length, "messages...");

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.3,
      max_tokens: 1000
    });

    const answer = completion.choices[0].message.content;
    console.log("✅ OpenAI response received:", answer?.substring(0, 100) + "...");
    
    if (!answer) {
      console.error("❌ No response from OpenAI");
      throw new Error('No response from OpenAI');
    }
    
    // Save AI log entry
    try {
      console.log("💾 Saving AI log entry...");
      const { error: logError } = await supabase
        .from('ai_logs')
        .insert({
          user_id: userId,
          agency_id: userContext.agency?.id || null,
          question,
          response: answer,
          timestamp: new Date().toISOString(),
        });
      
      if (logError) {
        console.error('❌ Failed to save AI log entry:', logError);
      } else {
        console.log("✅ AI log entry saved successfully");
      }
    } catch (logError) {
      console.error('❌ Failed to save AI log entry:', logError);
    }
    
    // 6. Log the Interaction (suppress errors)
    try {
      console.log("📊 Logging AI interaction...");
      await logAIInteraction({
        user_id: userId,
        agency_id: userContext.agency?.id,
        question: question,
        response: answer,
        timestamp: new Date().toISOString(),
      }, supabase);
      console.log("✅ AI interaction logged successfully");
    } catch (logError) {
      // Suppress logging errors so they don't break the main flow
      console.error('❌ Failed to log AI interaction:', logError);
    }

    return NextResponse.json({ answer });
  } catch (err) {
    console.error('❌ BlocIQ AI error:', err);
    console.error('❌ Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'AI failed to respond',
      details: process.env.NODE_ENV === 'development' ? err instanceof Error ? err.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
}

