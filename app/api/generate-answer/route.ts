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
You are BlocIQ, a property management assistant.

Use only the information below to answer the user's question. Do not use any external knowledge or training data.

Always provide leaseholder names and contact info if it's in the supplied data.
Do not invent data or default to privacy policies. Only answer based on the given records.

DATA:
${JSON.stringify(buildingsData, null, 2)}

QUESTION:
${question}
`;

  const aiRes = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.1,
    messages: [
      { role: 'system', content: 'You are BlocIQ, a property management assistant. You must ONLY use the data provided in the user message to answer questions. Never use external knowledge or training data. If the information is not in the provided data, say "I don\'t have that information in my database."' },
      { role: 'user', content: aiPrompt },
    ],
  });

  const answer = aiRes.choices[0].message.content;
  return NextResponse.json({ answer });
} 