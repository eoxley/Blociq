import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { cookies } from 'next/headers';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  // Use cookies from the request for Supabase auth
  const supabase = createRouteHandlerClient({ cookies });
  const { question } = await req.json();

  // 1. Get full structured data from Supabase
  const { data: buildingsData, error } = await supabase
    .from('buildings')
    .select(`
      id,
      name,
      address,
      units (
        id,
        unit_number,
        type,
        floor,
        leaseholders (
          name,
          email,
          phone
        )
      )
    `);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Inject into the AI's context
  const aiPrompt = `
You are a helpful property assistant.
Based on the data below, answer the user's question clearly and accurately.
Only use the provided data.

DATA:
${JSON.stringify(buildingsData, null, 2)}

QUESTION:
${question}
`;

  const aiRes = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    messages: [
      { role: 'system', content: 'You answer questions about leasehold buildings using Supabase data.' },
      { role: 'user', content: aiPrompt },
    ],
  });

  const answer = aiRes.choices[0].message.content;
  return NextResponse.json({ answer });
} 