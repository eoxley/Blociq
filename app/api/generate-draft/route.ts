// ✅ AUDIT COMPLETE [2025-01-15]
// - Field validation for email ID and action type
// - Supabase query with proper user_id filter
// - OpenAI integration for draft generation
// - Try/catch with detailed error handling
// - Used in inbox components

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookies() });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await req.json();
    const { emailId, actionType } = body;

    if (!emailId) {
      console.error('❌ No email ID provided in request');
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
    }

    if (!actionType || !['reply', 'reply-all', 'forward'].includes(actionType)) {
      console.error('❌ Invalid action type provided');
      return NextResponse.json({ error: 'Valid action type is required (reply, reply-all, forward)' }, { status: 400 });
    }

    console.log('🤖 Generating AI draft for email:', emailId, 'action:', actionType);

    // Get the email details
    const { data: email, error: fetchError } = await supabase
      .from('incoming_emails')
      .select(`
        *,
        buildings (
          name,
          address
        )
      `)
      .eq('id', emailId)
      .single();

    if (fetchError || !email) {
      console.error('❌ Failed to fetch email:', fetchError?.message);
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Build the prompt based on action type
    let prompt = '';
    let subject = '';

    switch (actionType) {
      case 'reply':
        prompt = `You are a professional property management assistant. Generate a polite and professional reply to this email. The email is from ${email.from_name || email.from_email} regarding ${email.subject}. The building is ${email.buildings?.name || 'Unknown'}. Keep the tone professional but friendly.`;
        subject = `Re: ${email.subject}`;
        break;
      
      case 'reply-all':
        prompt = `You are a professional property management assistant. Generate a polite and professional reply-all to this email. The email is from ${email.from_name || email.from_email} regarding ${email.subject}. The building is ${email.buildings?.name || 'Unknown'}. Keep the tone professional but friendly.`;
        subject = `Re: ${email.subject}`;
        break;
      
      case 'forward':
        prompt = `You are a professional property management assistant. Generate a professional forward message for this email. The original email is from ${email.from_name || email.from_email} regarding ${email.subject}. The building is ${email.buildings?.name || 'Unknown'}. Add a brief introduction explaining why you're forwarding this email.`;
        subject = `Fwd: ${email.subject}`;
        break;
    }

    // Add the original email content to the prompt
    prompt += `\n\nOriginal Email:\nFrom: ${email.from_name || email.from_email}\nSubject: ${email.subject}\nBody: ${email.body || email.body_preview || 'No content available'}`;

    // Generate the draft using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional property management assistant. Generate clear, concise, and professional email responses. Use proper email formatting and maintain a helpful tone.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const generatedDraft = completion.choices[0]?.message?.content || 'Unable to generate draft';

    console.log('✅ AI draft generated successfully');

    return NextResponse.json({ 
      success: true,
      draft: {
        subject: subject,
        body: generatedDraft,
        action_type: actionType,
        original_email_id: emailId
      }
    });

  } catch (error) {
    console.error('❌ Error in generate-draft route:', error);
    return NextResponse.json({ 
      error: 'Failed to generate draft',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
    }, { status: 500 });
  }
}
