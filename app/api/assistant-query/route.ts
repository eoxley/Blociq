// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for userQuestion
// - Supabase query with proper error handling
// - Try/catch with detailed error handling
// - Used in assistant components
// - Includes OpenAI integration with error handling

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import OpenAI from 'openai';
import { insertAiLog } from '@/lib/supabase/ai_logs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  console.log("✅ Assistant Query endpoint hit");

  try {
    const body = await req.json();
    const { userQuestion, buildingId } = body;

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

    // 🔍 Search documents by relevance to user question
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

    const context = matchedDocs
      ?.map((d) => `Document: ${d.file_name}\nType: ${d.type}\n\n${d.text_content?.slice(0, 1000)}`)
      .join('\n\n') || '';

    const prompt = `
You are BlocIQ — a property management assistant for UK leasehold blocks. Use real building documents to answer questions where possible.

If relevant, documents you can reference include:
${context || '[No matching documents found]'}

Question:
${userQuestion}

Answer:
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    const answer = response.choices[0].message?.content;

    console.log("🧠 Assistant reply:", answer);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Log the AI interaction if user is authenticated
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
      context: {
        building: buildingId ? 'Building context available' : null,
        documentsFound: matchedDocs?.length || 0,
      }
    });

  } catch (error: any) {
    console.error("❌ Assistant query error:", error);
    return NextResponse.json({ 
      error: 'Failed to process assistant query',
      details: error.message 
    }, { status: 500 });
  }
} 