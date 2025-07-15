import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getStructuredBuildingData } from '@/lib/getStructuredBuildingData';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { question } = await req.json();

  // 1. Get structured building data using utility function
  const buildingData = await getStructuredBuildingData('Ashwood House'); // or buildingId
  if (!buildingData) return NextResponse.json({ error: 'Failed to fetch building data.' }, { status: 500 });

  // 2. Inject into the AI's context
  const aiPrompt = `
You are BlocIQ, an expert assistant for block management.

Using the building information below, answer this question:

DATA:
${JSON.stringify(buildingData, null, 2)}

QUESTION:
${question}

Only respond using the provided data. Do not invent or generalise.
If something is not listed, say "No data found for that."
`;

  const aiRes = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.1,
    messages: [
      { role: 'system', content: 'You are BlocIQ, an expert assistant for block management. Only use the provided data to answer questions. Do not invent or generalise. If something is not in the data, say "No data found for that."' },
      { role: 'user', content: aiPrompt },
    ],
  });

  const answer = aiRes.choices[0].message.content;
  return NextResponse.json({ answer });
} 