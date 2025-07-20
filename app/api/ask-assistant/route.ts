// File: app/api/ask-assistant/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  console.log("✅ BlocIQ Assistant endpoint hit");

  try {
    let message: string;
    let buildingId: string | undefined;
    let unitId: string | undefined;
    const attachments: File[] = [];

    // Check if the request is multipart/form-data (with attachments) or JSON
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData with attachments
      const formData = await req.formData();
      message = formData.get('message') as string;
      buildingId = formData.get('buildingId') as string;
      unitId = formData.get('unitId') as string;
      
      // Extract attachments
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('attachment_') && value instanceof File) {
          attachments.push(value);
        }
      }
      
      console.log(`📎 Found ${attachments.length} attachments`);
    } else {
      // Handle JSON request
      const body = await req.json();
      message = body?.message;
      buildingId = body?.buildingId;
      unitId = body?.unitId;
    }

    if (!message && attachments.length === 0) {
      console.error("❌ No message or attachments provided");
      return NextResponse.json({ error: 'No message or attachments provided' }, { status: 400 });
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

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.warn("⚠️ Supabase session error:", sessionError.message);
    }

    console.log("📩 User message:", message);
    console.log("🏢 Building ID from context:", buildingId);
    console.log("🏠 Unit ID from context:", unitId);

    // 🔍 Search documents by relevance to user question
    const { data: documents } = await supabase
      .from('building_documents')
      .select('file_name, text_content, type, building_id')
      .limit(5)
      .order('created_at', { ascending: false });

    const matchedDocs = documents
      ?.filter((doc) => {
        const match = message.toLowerCase();
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

${attachments.length > 0 ? `User has attached ${attachments.length} file(s): ${attachments.map(f => f.name).join(', ')}` : ''}

Question:
${message || 'User has uploaded files for analysis'}

Answer:
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    const answer = response.choices[0].message?.content;

    console.log("🧠 Assistant reply:", answer);

    return NextResponse.json({ 
      answer: answer || "🤖 Sorry, I couldn't generate a response.",
      context: {
        building: buildingId ? 'Building context available' : null,
        unit: unitId ? 'Unit context available' : null,
        documentsFound: matchedDocs?.length || 0,
        attachmentsProcessed: attachments.length,
      }
    });

  } catch (error: unknown) {
    console.error("❌ Assistant error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to process assistant query',
      details: errorMessage 
    }, { status: 500 });
  }
} 