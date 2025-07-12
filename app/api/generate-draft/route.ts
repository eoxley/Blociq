import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '../../../lib/database.types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const { prompt, unitId } = await req.json();

  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
  }

  let emailContext = '';
  
  // If unitId is provided, fetch the latest emails for that unit
  if (unitId) {
    const { data: emails, error } = await supabase
      .from('incoming_emails')
      .select('subject, body_preview, received_at')
      .eq('unit_id', unitId)
      .order('received_at', { ascending: false })
      .limit(5); // Get the 5 most recent emails

    if (error) {
      console.error('Error fetching emails:', error);
      // Continue without email context if there's an error
    } else if (emails && emails.length > 0) {
      emailContext = '\n\nRecent emails for this unit:\n' + 
        emails.map(email => 
          `- ${email.subject} (${email.received_at ? new Date(email.received_at).toLocaleDateString() : 'No date'}): ${email.body_preview || 'No preview'}`
        ).join('\n');
    }
  }

  const fullPrompt = `Generate a helpful and professional response based on the following question about property management: "${prompt}"${emailContext}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are BlocAI, a helpful assistant for property management. Provide clear, professional, and actionable responses. If email context is provided, use it to give more relevant and contextual answers.',
        },
        { role: 'user', content: fullPrompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;

    return new Response(JSON.stringify({ 
      response: response,
      contextUsed: unitId ? true : false,
      emailCount: unitId ? (await supabase
        .from('incoming_emails')
        .select('id', { count: 'exact' })
        .eq('unit_id', unitId)
      ).count || 0 : 0
    }), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate response',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}
