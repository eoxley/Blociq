// ✅ AUDIT COMPLETE [2025-08-03] - ENHANCED WITH CONVERSATIONAL MEMORY [2025-01-15]
// - Field validation for userQuestion
// - Supabase query with proper error handling
// - Try/catch with detailed error handling
// - Used in assistant components
// - Includes OpenAI integration with error handling
// - NEW: Conversational memory with threads, rolling summaries, and fact extraction

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import OpenAI from 'openai';
import { insertAiLog } from '@/lib/supabase/ai_logs';
import { 
  upsertConversation, 
  appendMessage, 
  getRecentTurns, 
  summarizeThread, 
  extractFacts, 
  getDurableFacts,
  getConversation
} from '@/lib/ai/memory';
import { buildSystemPrompt, buildChatPrompt } from '@/lib/ai/prompt';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 90; // 1.5 minutes for AI assistant queries

export async function POST(req: Request) {
  console.log("✅ Enhanced Assistant Query endpoint hit with memory support");

  try {
    const body = await req.json();
    const { 
      userQuestion, 
      buildingId, 
      conversationId: maybeConversationId,
      useMemory = true 
    } = body;

    if (!userQuestion) {
      console.error("❌ No user question provided");
      return NextResponse.json({ error: 'No user question provided' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Handle conversation memory
    let conversationId = maybeConversationId;
    let rollingSummary = '';
    let recentTurns: Array<{ role: 'user'|'assistant'; content: string }> = [];
    let durableFacts: string[] = [];
    
    if (useMemory && user) {
      // Create or get conversation
      conversationId = await upsertConversation({ 
        id: maybeConversationId, 
        buildingId, 
        userId: user.id 
      });
      
      if (conversationId) {
        // Get existing conversation context
        const conversation = await getConversation(conversationId);
        rollingSummary = conversation?.rolling_summary || '';
        recentTurns = await getRecentTurns({ conversationId, limit: 8 });
        durableFacts = await getDurableFacts({ conversationId, buildingId });
        
        // Store user message
        await appendMessage({ 
          conversationId, 
          role: 'user', 
          content: userQuestion 
        });
      }
    }

    // 🔍 Search documents by relevance to user question (existing functionality)
    const { data: documents } = await supabase
      .from('building_documents')
      .select('file_name, text_content, type, building_id')
      .limit(5)
      .order('created_at', { ascending: false });

    const matchedDocs = documents
      ?.filter((doc) => {
        const match = userQuestion.toLowerCase();
        return (
          doc.text_content?.toLowerCase().includes(match) ||
          doc.type?.toLowerCase().includes(match)
        );
      })
      .slice(0, 3);

    const documentContext = matchedDocs
      ?.map((d) => `Document: ${d.file_name}\nType: ${d.type}\n\n${d.text_content?.slice(0, 1000)}`)
      .join('\n\n') || '';

    // Build enhanced prompt with memory
    let systemPrompt: string;
    let userPrompt: string;
    
    if (useMemory && conversationId && rollingSummary) {
      // Use memory-enhanced prompt
      systemPrompt = buildSystemPrompt({ 
        orgName: 'MIH Property Management', 
        tone: 'encouraging, quick and clever humor' 
      });
      
      userPrompt = buildChatPrompt({
        rollingSummary,
        recentTurns,
        durableFacts,
        buildingInfo: buildingId ? `Building ID: ${buildingId}` : null,
        userMessage: userQuestion
      });
      
      // Add document context if available
      if (documentContext) {
        userPrompt += `\n\nAdditional document context:\n${documentContext}`;
      }
    } else {
      // Fallback to original prompt structure
      systemPrompt = `
You are BlocIQ — a property management assistant for UK leasehold blocks. Use real building documents to answer questions where possible.

If relevant, documents you can reference include:
${documentContext || '[No matching documents found]'}

Question:
${userQuestion}

Answer:
      `;
      userPrompt = '';
    }

    // Call OpenAI with appropriate messages
    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    
    if (userPrompt) {
      messages.push({ role: 'user', content: userPrompt });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.3,
      max_tokens: 1500
    });

    const answer = response.choices[0].message?.content;

    console.log("🧠 Enhanced Assistant reply with memory:", answer);

    // Store AI response if using memory
    if (useMemory && conversationId && user) {
      await appendMessage({ 
        conversationId, 
        role: 'assistant', 
        content: answer || "🤖 Sorry, I couldn't generate a response." 
      });
      
      // Update memory asynchronously (don't block response)
      Promise.all([
        summarizeThread(conversationId),
        extractFacts({ 
          conversationId, 
          newText: `${userQuestion}\n\n${answer}`, 
          buildingId 
        })
      ]).catch(console.error);
    }

    // Log the AI interaction if user is authenticated (existing functionality)
    let logId = null;
    if (user) {
      logId = await insertAiLog({
        user_id: user.id,
        question: userQuestion,
        response: answer || "🤖 Sorry, I couldn't generate a response.",
        context_type: 'assistant',
        building_id: buildingId,
        document_ids: matchedDocs?.map(doc => doc.file_name) || [],
      });
    }

    return NextResponse.json({ 
      answer: answer || "🤖 Sorry, I couldn't generate a response.",
      ai_log_id: logId,
      conversationId: conversationId || null,
      memoryUsed: useMemory && !!conversationId,
      context: {
        building: buildingId ? 'Building context available' : null,
        documentsFound: matchedDocs?.length || 0,
        complianceUsed: false,
        majorWorksUsed: false,
        memoryContext: useMemory ? {
          rollingSummary: !!rollingSummary,
          factsUsed: durableFacts.length,
          recentTurns: recentTurns.length
        } : null
      }
    });

  } catch (error: any) {
    console.error("❌ Enhanced Assistant query error:", error);
    return NextResponse.json({ 
      error: 'Failed to process assistant query',
      details: error.message 
    }, { status: 500 });
  }
} 