import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

interface AIEmailRequest {
  action: 'draft' | 'summary' | 'analyse' | 'categorise' | 'suggest-reply' | 'extract-info';
  emailId?: string;
  emailContent?: {
    subject: string;
    body: string;
    from: string;
    receivedAt: string;
  };
  context?: {
    buildingId?: string;
    buildingName?: string;
    previousEmails?: any[];
    userRole?: string;
  };
  options?: {
    tone?: 'professional' | 'friendly' | 'formal' | 'casual';
    length?: 'brief' | 'standard' | 'detailed';
    includeLegal?: boolean;
    includeNextSteps?: boolean;
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
    // Get authenticated user - Safe destructuring to prevent "Right side of assignment cannot be destructured" error
    const sessionResult = await supabase.auth.getSession();
    const sessionData = sessionResult?.data || {}
    const session = sessionData.session || null
    const sessionError = sessionResult?.error || null
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;

    const { action, emailId, emailContent, context, options }: AIEmailRequest = await req.json();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build context based on action
    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'draft':
        systemPrompt = `You are a professional property management assistant specializing in UK leasehold management. 
        Create professional, clear, and legally appropriate email responses.
        
        Guidelines:
        - Use a ${options?.tone || 'professional'} tone
        - Be clear, concise, and actionable
        - Include relevant legal references when appropriate
        - Structure the message logically
        - End with a professional closing
        - Consider the building context and previous communications
        - Provide specific timelines and next steps when relevant`;
        
        userPrompt = `Generate a ${options?.length || 'standard'} email draft in response to:
        
        Subject: ${emailContent?.subject || 'No subject'}
        From: ${emailContent?.from || 'Unknown sender'}
        Content: ${emailContent?.body || 'No content'}
        
        Building: ${context?.buildingName || 'Not specified'}
        Previous context: ${context?.previousEmails ? `${context.previousEmails.length} previous emails` : 'No previous context'}
        
        Please create a professional response that addresses the sender's concerns appropriately.`;
        break;

      case 'summary':
        systemPrompt = `You are an expert at summarizing property management emails. 
        Create concise, actionable summaries that highlight key points, required actions, and urgency.`;
        
        userPrompt = `Summarize this email for a property manager:
        
        Subject: ${emailContent?.subject}
        From: ${emailContent?.from}
        Content: ${emailContent?.body}
        
        Provide:
        1. Key points (2-3 bullet points)
        2. Required actions (if any)
        3. Urgency level (Low/Medium/High)
        4. Category (Maintenance/Compliance/Complaint/General)`;
        break;

      case 'analyse':
        systemPrompt = `You are an expert property management analyst. 
        Analyse emails for sentiment, urgency, legal implications, and required actions.`;
        
        userPrompt = `Analyse this email:
        
        Subject: ${emailContent?.subject}
        From: ${emailContent?.from}
        Content: ${emailContent?.body}
        
        Provide analysis on:
        1. Sentiment (Positive/Neutral/Negative)
        2. Urgency (Low/Medium/High/Critical)
        3. Legal implications (None/Minor/Major)
        4. Required actions
        5. Suggested response time
        6. Priority level (1-5)`;
        break;

      case 'categorise':
        systemPrompt = `You are an expert property management triage specialist using British English. 
        Analyse emails for urgency, action requirements, and provide comprehensive triage information.
        
        Guidelines:
        - Use British English spelling and terminology
        - Assess urgency based on content, tone, and context
        - Determine appropriate action timeline
        - Provide clear, actionable insights
        - Consider property management context
        - Format response in structured sections`;
        
        userPrompt = `Analyse this property management email for triage purposes:
        
        Subject: ${emailContent?.subject}
        From: ${emailContent?.from}
        Content: ${emailContent?.body}
        Received: ${emailContent?.receivedAt}
        
        Please provide a structured analysis in the following format:
        
        Urgency: [critical/high/medium/low/none]
        Action Required: [immediate/today/this_week/no_action/file]
        Category: [Maintenance/Compliance/Complaint/Service Charge/General/Other]
        Summary: [2-3 sentence summary of the email content and key points]
        Suggested Actions: [comma-separated list of recommended actions]
        Tags: [comma-separated relevant tags]
        Estimated Response Time: [1 hour/4 hours/24 hours/48 hours/1 week/no response needed]
        
        Consider:
        - Is this urgent or time-sensitive?
        - Does it require immediate attention?
        - Can it be filed or marked as no action needed?
        - What type of response is appropriate?
        - Are there any legal or compliance implications?
        
        Use British English spelling and terminology throughout.`;
        break;

      case 'suggest-reply':
        systemPrompt = `You are a property management communication expert. 
        Suggest appropriate reply strategies and talking points for email responses.`;
        
        userPrompt = `Suggest a reply strategy for:
        
        Subject: ${emailContent?.subject}
        From: ${emailContent?.from}
        Content: ${emailContent?.body}
        
        Provide:
        1. Recommended tone
        2. Key points to address
        3. Suggested timeline for response
        4. Any legal considerations
        5. Follow-up actions needed`;
        break;

      case 'extract-info':
        systemPrompt = `You are an expert at extracting structured information from property management emails. 
        Extract key details in a structured format.`;
        
        userPrompt = `Extract information from this email:
        
        Subject: ${emailContent?.subject}
        From: ${emailContent?.from}
        Content: ${emailContent?.body}
        
        Extract:
        1. Contact information
        2. Unit/apartment number (if mentioned)
        3. Specific issues or requests
        4. Dates mentioned
        5. Any financial amounts
        6. Urgent matters
        7. Contact preferences`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const result = completion.choices[0].message.content;

    // Log the AI interaction
    try {
      await supabase
        .from('ai_logs')
        .insert({
          user_id: user.id,
          question: `${action} request for email`,
          response: result,
          timestamp: new Date().toISOString(),
        });
    } catch (logError) {
      console.error('Failed to log AI interaction:', logError);
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Email Assistant error:', error);
    return NextResponse.json({
      error: 'Failed to process AI request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 