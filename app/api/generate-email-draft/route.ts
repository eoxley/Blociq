import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

interface GenerateEmailDraftRequest {
  emailId?: string;
  subject: string | null;
  body: string | null;
  buildingContext?: string;
  tags?: string[];
  userRequest?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  mode?: 'reply' | 'replyAll' | 'forward';
}

export async function POST(req: NextRequest) {
  try {
    const { emailId, subject, body, buildingContext, tags = [], userRequest, conversationHistory = [], mode }: GenerateEmailDraftRequest = await req.json();
    
    if (!subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get email details and building context if emailId is provided
    let email = null;
    let buildingName = buildingContext || 'Unknown Building';
    let buildingAddress = '';
    let senderName = 'Unknown Sender';
    let emailTags = tags;

    if (emailId) {
      const { data: emailData } = await supabase
        .from('incoming_emails')
        .select(`
          *,
          buildings(name, address)
        `)
        .eq('id', emailId)
        .single();

      if (emailData) {
        email = emailData;
        buildingName = email.buildings?.name || buildingContext || 'Unknown Building';
        buildingAddress = email.buildings?.address || '';
        senderName = email.from_name || email.from_email || 'Unknown Sender';
        emailTags = email.tags || tags;
      }
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are a professional property management assistant helping to draft email replies using British English. 
    
Context:
- Building: ${buildingName}${buildingAddress ? ` (${buildingAddress})` : ''}
- Sender: ${senderName}
- Email Tags: ${emailTags.length > 0 ? emailTags.join(', ') : 'None'}
- Original Subject: ${subject}

Guidelines:
- Be professional, courteous, and helpful using British English
- Address the specific concerns in the original email
- Provide clear, actionable responses
- Use appropriate tone based on the email content and tags
- Include relevant building-specific information when applicable
- Keep responses concise but comprehensive
- End with a professional closing using "Kind regards" or similar British formalities
- If the email requires follow-up action, clearly state what will happen next
- Use British English spelling throughout (e.g., analyse, summarise, organise, recognise, apologise, customise, centre, defence)
- Format dates as DD/MM/YYYY (British format)
- Use British terminology and expressions appropriate for UK property management`;

    // Build conversation context if available
    const conversationContext = conversationHistory.length > 0 
      ? `\n\nPrevious conversation:\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
      : '';

    const userPrompt = userRequest 
      ? `User Request: ${userRequest}

Original Email:
Subject: ${subject}
From: ${senderName}
Content: ${body}
Mode: ${mode || 'reply'}${conversationContext}

Please generate a response based on the user's specific request. The response should:
1. Address the user's specific request
2. Be appropriate for the email mode (${mode || 'reply'})
3. Maintain professional tone and British English
4. Include relevant building context if applicable
5. End with a professional closing

Return only the reply content, no additional formatting or explanations.`
      : `Please draft a professional reply to this email:

Original Email:
Subject: ${subject}
From: ${senderName}
Content: ${body}
Mode: ${mode || 'reply'}

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