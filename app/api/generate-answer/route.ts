import { NextResponse } from 'next/server';
import { buildAIContext } from '../../../lib/buildAIContext';
import { getOpenAIClient } from '@/lib/openai-client';

// Force deployment update - latest debugging changes
export async function POST(req: Request) {
  try {
    console.log("🧠 Incoming assistant request to /api/generate-answer");
    
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY environment variable is missing');
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    console.log("✅ OpenAI API key found");

    const openai = getOpenAIClient();
    
    const body = await req.json();
    console.log("📨 Request body:", body);
    
    const { question, buildingId } = body;

    if (!question) {
      console.error("❌ No question provided in request");
      return NextResponse.json({ error: 'Missing question.' }, { status: 400 });
    }

    if (!buildingId) {
      console.error("❌ No building ID provided in request");
      return NextResponse.json({ error: 'Missing building ID.' }, { status: 400 });
    }

    console.log("✅ Valid request received - Question:", question, "Building ID:", buildingId);

    // 👇 Build structured context
    console.log("🔍 Building AI context for building:", buildingId);
    const context = await buildAIContext(buildingId);

    if (!context) {
      console.error('❌ Missing or incomplete context for building:', buildingId);
      return NextResponse.json({
        error: 'Could not build context for this building. Please check your data.',
      }, { status: 500 });
    }

    console.log("✅ Context built successfully, length:", context.length);

    // 👇 Build AI prompt
    const prompt = `
You are BlocIQ, a UK property management AI assistant. Answer the question using only the information provided.

DATA:
${context}

QUESTION:
${question}

If information is missing, say: "That information is not in the records."
`;

    console.log("🤖 Calling OpenAI API...");
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      messages: [
        { role: 'system', content: 'You are a helpful, accurate assistant for property managers in the UK.' },
        { role: 'user', content: prompt },
      ],
    });

    const answer = response.choices[0].message.content;
    console.log("✅ OpenAI response received:", answer?.substring(0, 100) + "...");

    return NextResponse.json({ answer });

  } catch (err: any) {
    console.error('❌ AI Error:', err.message || err);
    console.error('❌ Error stack:', err.stack);
    return NextResponse.json({
      error: err.message || 'Something went wrong. Please try again.',
    }, { status: 500 });
  }
} 