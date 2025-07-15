import { NextResponse } from 'next/server';
import { buildAIContext } from '../../../lib/buildAIContext';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { question, buildingId } = await req.json();

    if (!question || !buildingId) {
      return NextResponse.json({ error: 'Missing question or building ID.' }, { status: 400 });
    }

    // 👇 Build structured context
    const context = await buildAIContext(buildingId);

    if (!context) {
      console.error('Missing or incomplete context for building:', buildingId);
      return NextResponse.json({
        error: 'Could not build context for this building. Please check your data.',
      }, { status: 500 });
    }

    // 👇 Build AI prompt
    const prompt = `
You are BlocIQ, a UK property management AI assistant. Answer the question using only the information provided.

DATA:
${context}

QUESTION:
${question}

If information is missing, say: "That information is not in the records."
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      messages: [
        { role: 'system', content: 'You are a helpful, accurate assistant for property managers in the UK.' },
        { role: 'user', content: prompt },
      ],
    });

    const answer = response.choices[0].message.content;

    return NextResponse.json({ answer });

  } catch (err: any) {
    console.error('AI Error:', err.message || err);
    return NextResponse.json({
      error: err.message || 'Something went wrong. Please try again.',
    }, { status: 500 });
  }
} 