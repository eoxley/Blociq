import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '../../../lib/database.types'; // ✅ RELATIVE path, not alias
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { emailId } = await req.json();

  const { data: email, error } = await supabase
    .from('incoming_emails')
    .select('*')
    .eq('id', emailId)
    .single();

  if (error || !email) {
    return new Response(JSON.stringify({ error: 'Email not found' }), { status: 404 });
  }

  const prompt = `Generate a helpful and professional email reply based on the following message:\n\n"${email.body_preview}"`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant writing replies to property management emails.',
      },
      { role: 'user', content: prompt },
    ],
  });

  const reply = completion.choices[0].message.content;

  return new Response(JSON.stringify({ draft: reply }), { status: 200 });
}
