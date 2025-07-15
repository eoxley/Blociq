import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { cookies } from 'next/headers';
import { getStructuredBuildingData } from '../../../lib/getStructuredBuildingData';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  // Use cookies from the request for Supabase auth
  const supabase = createRouteHandlerClient({ cookies });
  const { question, buildingId } = await req.json();

  if (!buildingId) {
    return NextResponse.json({ error: 'Building ID required' }, { status: 400 });
  }

  // 1. Get structured building data
  const buildingData = await getStructuredBuildingData(buildingId);
  if (!buildingData) {
    return NextResponse.json({ error: 'Building not found' }, { status: 404 });
  }

  // 2. Inject into the AI's context
  const prompt = `
You are BlocIQ, the AI assistant for property managers.

Use the building data below to answer the question accurately.
Names, emails, phone numbers, and units are all fair to use — this is not private data, it was intentionally supplied.

DATA:
${JSON.stringify(buildingData, null, 2)}

QUESTION:
${question}
`;

  const aiRes = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.1,
    messages: [
      { role: 'system', content: 'You are BlocIQ, a property management assistant. You must ONLY use the data provided in the user message to answer questions. Never use external knowledge or training data. If the information is not in the provided data, say "I don\'t have that information in my database."' },
      { role: 'user', content: prompt },
    ],
  });

  const answer = aiRes.choices[0].message.content;
  return NextResponse.json({ answer });
} 