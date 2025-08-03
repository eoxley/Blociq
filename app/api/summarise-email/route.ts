import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

interface SummariseEmailRequest {
  emailId: string;
  subject: string | null;
  body: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const { emailId, subject, body }: SummariseEmailRequest = await req.json();
    
    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create the prompt for email summarization
    const systemPrompt = `You are a professional property management assistant. Your task is to provide a concise, bullet-point summary of emails related to property management, leasehold issues, and building maintenance.

Guidelines for summarization:
- Extract the key points and main issues
- Identify any urgent matters or deadlines
- Highlight action items or required responses
- Note any specific building or leaseholder references
- Keep the summary clear and actionable
- Use British English spelling and terminology
- Focus on property management context

Format the summary as clear bullet points with appropriate categorization.`;

    const userPrompt = `Please summarize the following email:

Subject: ${subject || 'No subject'}

Content:
${body || 'No content available'}

Provide a concise bullet-point summary focusing on:
1. Main issues or concerns
2. Any urgent matters or deadlines
3. Required actions or responses
4. Building or leaseholder context
5. Key details for property management`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const summary = completion.choices[0]?.message?.content || 'No summary generated';

    // Log the summarization for debugging
    console.log(`📝 Email ${emailId} summarized successfully`);

    return NextResponse.json({ 
      success: true,
      summary: summary,
      emailId: emailId
    });

  } catch (error) {
    console.error('❌ Error in summarise-email:', error);
    
    return NextResponse.json({ 
      error: 'Failed to summarize email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 