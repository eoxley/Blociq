import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

interface GenerateEmailDraftRequest {
  emailId: string;
  subject: string | null;
  body: string | null;
  buildingContext?: string;
  tags?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { emailId, subject, body, buildingContext, tags = [] }: GenerateEmailDraftRequest = await req.json();
    
    if (!emailId || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get email details and building context
    const { data: email } = await supabase
      .from('incoming_emails')
      .select(`
        *,
        buildings(name, address)
      `)
      .eq('id', emailId)
      .single();

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build context for AI
    const buildingName = email.buildings?.name || buildingContext || 'Unknown Building';
    const buildingAddress = email.buildings?.address || '';
    const senderName = email.from_name || email.from_email || 'Unknown Sender';
    const emailTags = email.tags || tags;

    const systemPrompt = `You are a professional property management assistant helping to draft email replies. 
    
Context:
- Building: ${buildingName}${buildingAddress ? ` (${buildingAddress})` : ''}
- Sender: ${senderName}
- Email Tags: ${emailTags.length > 0 ? emailTags.join(', ') : 'None'}
- Original Subject: ${subject}

Guidelines:
- Be professional, courteous, and helpful
- Address the specific concerns in the original email
- Provide clear, actionable responses
- Use appropriate tone based on the email content and tags
- Include relevant building-specific information when applicable
- Keep responses concise but comprehensive
- End with a professional closing
- If the email requires follow-up action, clearly state what will happen next`;

    const userPrompt = `Please draft a professional reply to this email:

Original Email:
Subject: ${subject}
From: ${senderName}
Content: ${body}

Please generate a professional reply that:
1. Acknowledges the sender's concerns
2. Provides a helpful and actionable response
3. Uses appropriate tone and language
4. Includes relevant building context if applicable
5. Ends with a professional closing

Return only the reply content, no additional formatting or explanations.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const generatedDraft = completion.choices[0]?.message?.content || '';

    if (!generatedDraft) {
      return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      draft: generatedDraft,
      context: {
        buildingName,
        senderName,
        tags: emailTags
      }
    });

  } catch (error: any) {
    console.error('Error in generate-email-draft:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 