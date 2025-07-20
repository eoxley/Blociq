import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { email_id } = await req.json();

  // Get the current user's session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!email_id) {
    return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
  }

  try {
    // Fetch the email from Supabase
    const { data: email, error: fetchError } = await supabase
      .from('incoming_emails')
      .select('subject, body_full, body_preview, from_name, from_email, buildings(name)')
      .eq('id', email_id)
      .single();

    if (fetchError || !email) {
      console.error('Email not found:', fetchError?.message);
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Prepare the email content for summarization
    const emailContent = `
Subject: ${email.subject || 'No Subject'}
From: ${email.from_name || 'Unknown'} (${email.from_email || 'No email'})
Building: ${email.buildings?.name || 'No building specified'}

Body:
${email.body_full || email.body_preview || 'No content available'}
    `.trim();

    // Create the prompt for OpenAI
    const prompt = `Summarise the following email in 3 bullet points for the property manager. Focus on key actions, issues, or important information that needs attention.

${emailContent}

Provide a concise summary with 3 bullet points:`;

    // Call OpenAI for summarization
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that summarizes emails for property managers. Provide clear, actionable bullet points."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const summary = completion.choices[0]?.message?.content || 'Unable to generate summary';

    // Log the summarization for analytics
    try {
      await supabase.from('email_summaries').insert({
        email_id: email_id,
        user_id: session.user.id,
        summary: summary,
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Error logging summary:', logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({ 
      summary: summary,
      success: true
    });

  } catch (error) {
    console.error('Error summarizing email:', error);
    return NextResponse.json({ 
      error: 'Failed to summarize email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 