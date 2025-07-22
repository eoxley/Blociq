import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import OpenAI from 'openai';

interface GenerateReplyRequest {
  emailId?: string;
  subject?: string;
  body?: string;
  categories?: string[];
  flag_status?: string;
  from_email?: string;
  prompt?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { emailId, subject, body, categories, flag_status, from_email, prompt }: GenerateReplyRequest = await req.json();
    
    if (!subject && !body && !prompt) {
      return NextResponse.json({ error: 'Subject, body, or prompt is required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If emailId is provided, fetch the email details from database
    let emailData = { subject, body, categories, flag_status, from_email };
    if (emailId) {
      const { data: email, error } = await supabase
        .from('incoming_emails')
        .select('subject, body_preview, categories, flag_status, from_email')
        .eq('id', emailId)
        .single();

      if (error) {
        console.error('Error fetching email:', error);
      } else if (email) {
        // Type assertion since the database types might not be updated yet
        const emailRecord = email as any;
        emailData = {
          subject: emailRecord.subject || undefined,
          body: emailRecord.body_preview || undefined,
          categories: emailRecord.categories || undefined,
          flag_status: emailRecord.flag_status || undefined,
          from_email: emailRecord.from_email || undefined
        };
      }
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build context-aware prompt based on email tags and status
    const tagContext = buildTagContext(emailData.categories || [], emailData.flag_status || null);
    const urgencyContext = emailData.flag_status === 'flagged' ? 'URGENT - This email has been flagged as requiring immediate attention.' : '';
    
    const systemPrompt = `You are a professional property management assistant responding to leaseholder emails using British English. 
    
${tagContext}

Guidelines:
- Use a professional, courteous, and helpful tone using British English
- Address the specific concerns mentioned in the email
- Provide clear, actionable responses
- Be empathetic to leaseholder concerns
- Include next steps or follow-up actions when appropriate
- Keep responses concise but comprehensive
- Use appropriate formality based on the email context
- End with a professional closing using "Kind regards" or similar British formalities
${urgencyContext ? `- ${urgencyContext}` : ''}

Response Structure:
1. Acknowledge the concern/request
2. Provide relevant information or solution
3. Outline next steps or timeline
4. Offer additional support if needed
5. Professional closing using British formalities

Use British English spelling throughout (e.g., analyse, summarise, organise, recognise, apologise, customise, centre, defence) and format dates as DD/MM/YYYY.`;

    const userPrompt = prompt || `Generate a professional reply to this email:

Subject: ${emailData.subject || 'No subject'}
From: ${emailData.from_email || 'Unknown sender'}
Content: ${emailData.body || 'No content available'}

Please provide a helpful and professional response that addresses the sender's concerns.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const generatedReply = completion.choices[0]?.message?.content || '';

    if (!generatedReply) {
      return NextResponse.json({ error: 'Failed to generate reply' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      response: generatedReply,
      context: {
        tags: emailData.categories,
        flag_status: emailData.flag_status,
        urgency: emailData.flag_status === 'flagged'
      }
    });

  } catch (error: any) {
    console.error('Error in generate-reply:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to build context based on email tags
function buildTagContext(categories: string[], flagStatus: string | null): string {
  const contextParts = [];
  
  if (categories.includes('Urgent')) {
    contextParts.push('This is an URGENT matter requiring immediate attention and quick response.');
  }
  
  if (categories.includes('Compliance')) {
    contextParts.push('This involves compliance or regulatory matters. Be thorough and reference relevant policies or regulations.');
  }
  
  if (categories.includes('Leaseholder')) {
    contextParts.push('This is a leaseholder concern. Be empathetic and provide clear guidance on lease-related matters.');
  }
  
  if (categories.includes('Maintenance')) {
    contextParts.push('This is a maintenance request. Provide clear timeline and next steps for resolution.');
  }
  
  if (categories.includes('Financial')) {
    contextParts.push('This involves financial matters. Be precise with numbers and payment terms.');
  }
  
  if (categories.includes('Legal')) {
    contextParts.push('This involves legal matters. Be careful with language and suggest professional consultation if needed.');
  }
  
  if (categories.includes('Emergency')) {
    contextParts.push('This is an EMERGENCY situation. Prioritize safety and immediate action.');
  }
  
  if (categories.includes('Routine')) {
    contextParts.push('This is a routine matter. Provide standard information and procedures.');
  }
  
  if (flagStatus === 'flagged') {
    contextParts.push('This email has been flagged for special attention. Ensure thorough and prompt response.');
  }
  
  return contextParts.length > 0 
    ? `Context: ${contextParts.join(' ')}`
    : 'This is a general inquiry. Provide helpful and professional assistance.';
} 