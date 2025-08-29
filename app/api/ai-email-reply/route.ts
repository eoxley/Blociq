import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth/server';

export async function POST(req: NextRequest) {
  try {
    // Use consolidated authentication
    const { supabase, user } = await requireAuth();
    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI not configured');
      return NextResponse.json({ 
        error: 'AI service not configured. Please check environment variables.' 
      }, { status: 500 });
    }

    const body = await req.json();
    const { 
      originalEmail, 
      replyType, 
      buildingContext, 
      leaseholderContext,
      tone = 'Professional',
      emailData, // New field for direct email data
      draftType = 'reply' // New field for draft type
    } = body;

    // Support both originalEmail (legacy) and emailData (new) formats
    let emailContent = originalEmail;
    if (emailData) {
      emailContent = {
        from: emailData.from,
        subject: emailData.subject,
        content: emailData.plainText || emailData.body,
        receivedAt: emailData.date
      };
    }

    if (!emailContent) {
      return NextResponse.json({ error: 'Missing email content' }, { status: 400 });
    }

    // Dynamic import to prevent build-time execution
    const { default: OpenAI } = await import('openai');
    const openai = getOpenAIClient();

    // Build context-aware prompt
    const systemPrompt = buildEmailReplyPrompt(replyType || draftType, buildingContext, leaseholderContext, tone);
    
    const userPrompt = `Generate a professional email ${draftType || replyType} to this email:

From: ${emailContent.from || 'Unknown'}
Subject: ${emailContent.subject || '(No subject)'}
Content: ${emailContent.content || ''}

Please generate a professional, contextual ${draftType || replyType} that:
1. Addresses the original sender appropriately
2. Provides a relevant response to the email content
3. Maintains professional tone and formatting
4. Is concise but comprehensive
5. Uses proper email etiquette
6. Includes relevant building/leaseholder context if available
7. Uses British English spelling and terminology
8. Ends with "Kind regards" or similar British formalities

Generate the reply in plain text format (no HTML tags).`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'No response generated';

    return NextResponse.json({ 
      success: true,
      response: aiResponse,
      replyType: replyType || draftType,
      buildingContext: !!buildingContext,
      leaseholderContext: !!leaseholderContext
    });

  } catch (error: any) {
    console.error("AI Email Reply generation error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to generate AI email reply" 
    }, { status: 500 });
  }
}

function buildEmailReplyPrompt(replyType: string, buildingContext: any, leaseholderContext: any, tone: string) {
  let prompt = `You are an AI assistant helping property managers write professional email replies. 

Tone: ${tone}
Reply Type: ${replyType}

Guidelines:
- Use British English spelling and terminology
- Be professional, courteous, and helpful
- Keep replies concise but comprehensive
- Address the specific points raised in the original email
- Use proper email etiquette and formatting
- Sign off with "Kind regards" or "Best regards"
- Use British English spelling throughout (e.g., analyse, summarise, organise, recognise, apologise, customise, centre, defence)
- Format dates as DD/MM/YYYY (British format)
- Use British terminology and expressions appropriate for UK property management`;

  if (buildingContext) {
    prompt += `

Building Context Available:
- Building: ${buildingContext.name || 'N/A'}
- Address: ${buildingContext.address || 'N/A'}
- Property Manager: ${buildingContext.manager || 'N/A'}

Use this context to make your reply more relevant and specific.`;
  }

  if (leaseholderContext) {
    prompt += `

Leaseholder Context Available:
- Unit: ${leaseholderContext.unit || 'N/A'}
- Name: ${leaseholderContext.name || 'N/A'}
- Contact: ${leaseholderContext.contact || 'N/A'}

Reference this information appropriately in your reply.`;
  }

  prompt += `

Property Management Specific Guidelines:
- For maintenance requests: acknowledge, explain process, set expectations
- For complaints: show understanding, explain actions being taken
- For financial matters: be clear about processes and timelines
- For legal/compliance: refer to relevant policies and procedures
- Always maintain a helpful and professional tone

Format your reply as plain text with proper paragraphs and line breaks.`;

  return prompt;
}
