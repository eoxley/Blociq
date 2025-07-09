import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  try {
    // Fetch relevant tables
    const [{ data: buildings }, { data: units }, { data: leases }, { data: compliance }] = await Promise.all([
      supabase.from('buildings').select('id, name, address'),
      supabase.from('units').select('id, building_id, unit_number, floor'),
      supabase.from('leases').select('id, unit_id, leaseholder_name, lease_term_start, lease_term_end'),
      supabase.from('compliance_docs').select('id, building_id, document_type, uploaded_at'),
    ]);

    const context = `
BlocIQ Database Summary:

🏢 Buildings (${buildings?.length || 0} total):
${buildings?.map(b => `- ${b.name} (${b.address})`).join('\n') || 'No buildings found.'}

🏘️ Units (${units?.length || 0} total):
${units?.slice(0, 10).map(u => `- Unit ${u.unit_number} in building ID ${u.building_id}`).join('\n') || 'No units found.'}

📄 Leases (${leases?.length || 0} total):
${leases?.slice(0, 5).map(l => `- ${l.leaseholder_name} (unit ID ${l.unit_id}, ${l.lease_term_start}–${l.lease_term_end})`).join('\n') || 'No leases found.'}

✅ Compliance Docs (${compliance?.length || 0} total):
${compliance?.slice(0, 5).map(c => `- ${c.document_type} for building ID ${c.building_id} on ${c.uploaded_at}`).join('\n') || 'No documents found.'}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are BlocIQ, a helpful AI assistant for property managers. You are connected to a Supabase database with the following information:\n\n${context}`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const answer = completion.choices[0].message.content;
    return NextResponse.json({ answer });
  } catch (err) {
    console.error('BlocIQ AI error:', err);
    return NextResponse.json({ error: 'AI failed to respond' }, { status: 500 });
  }
}
