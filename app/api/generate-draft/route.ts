import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookies() });
  const { emailId } = await req.json();

  // Step 1: Get the email
  const { data: email, error: emailError } = await supabase
    .from('incoming_emails')
    .select('id, subject, body_preview, from_email, building_id')
    .eq('id', emailId)
    .single();

  if (emailError || !email) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 });
  }

  // Step 2: Get building info
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('name')
    .eq('id', email.building_id)
    .single();

  // Step 3: Get recent diary entries (up to 5)
  const { data: diaryEntries } = await supabase
    .from('diary_entries')
    .select('entry_text, created_at')
    .eq('building_id', email.building_id)
    .order('created_at', { ascending: false })
    .limit(5);

  const diarySummary = diaryEntries?.map(entry =>
    `- ${entry.entry_text} (${new Date(entry.created_at).toLocaleDateString()})`
  ).join('\n') || 'No recent building entries.';

  // Step 4: Compose GPT prompt
  const prompt = `
You are an assistant helping manage residential apartment blocks. You’re replying to a leaseholder about a communal issue at the building.

Only respond to the communal matter. Avoid discussing internal flat issues. Always stay professional, calm, and reassuring.

Here is the leaseholder's email:
---
Subject: ${email.subject}
From: ${email.from_email}
Message: ${email.body_preview}
---

Building: ${building?.name || 'Unknown'}
Recent building diary entries:
${diarySummary}

Now write a short and helpful reply from the managing agent. End with:
Kind regards
BlocIQ Management Team
`;

  // Step 5: Generate draft reply
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
  });

  const draft = completion.choices[0].message.content;

  return NextResponse.json({ draft });
}
