// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for subject
// - Authentication check with user validation
// - Supabase query with proper .eq() filter
// - Try/catch with detailed error handling
// - Used in email composition components
// - Includes OpenAI integration with error handling

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

interface GenerateNewEmailDraftRequest {
  subject: string;
  recipient?: string | null;
  building_id?: string | null;
  context?: string | null;
  purpose?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { subject, recipient, building_id, context, purpose }: GenerateNewEmailDraftRequest = await req.json();
    
    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get building context if building_id is provided
    let buildingContext = '';
    if (building_id) {
      const { data: building } = await supabase
        .from('buildings')
        .select('name, address, unit_count')
        .eq('id', building_id)
        .single();

      if (building) {
        buildingContext = `Building: ${building.name}${building.address ? ` (${building.address})` : ''}${building.unit_count ? ` - ${building.unit_count} units` : ''}`;
      }
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build system prompt
    const systemPrompt = `You are a professional property management assistant helping to draft new emails using British English. 

Context:
${buildingContext ? `- ${buildingContext}` : ''}
${recipient ? `- Recipient: ${recipient}` : ''}
${context ? `- Additional Context: ${context}` : ''}
${purpose ? `- Purpose: ${purpose}` : ''}

Guidelines:
- Be professional, courteous, and helpful using British English
- Address the subject matter appropriately
- Provide clear, actionable content
- Use appropriate tone for property management
- Include relevant building-specific information when applicable
- Keep content concise but comprehensive
- End with a professional closing using "Kind regards" or similar British formalities
- If the email requires follow-up action, clearly state what will happen next
- Use a warm but professional greeting
- Structure the email logically with proper paragraphs
- Use British English spelling throughout (e.g., analyse, summarise, organise, recognise, apologise, customise, centre, defence)
- Format dates as DD/MM/YYYY (British format)
- Use British terminology and expressions appropriate for UK property management`;

    const userPrompt = `Please draft a professional email with the following details:

Subject: ${subject}
${recipient ? `Recipient: ${recipient}` : ''}
${buildingContext ? `Building Context: ${buildingContext}` : ''}
${context ? `Additional Context: ${context}` : ''}
${purpose ? `Purpose: ${purpose}` : ''}

Please generate a professional email that:
1. Has an appropriate greeting
2. Addresses the subject matter clearly and professionally
3. Provides helpful and actionable content
4. Uses appropriate tone and language for property management
5. Includes relevant building context if applicable
6. Ends with a professional closing
7. Is well-structured with proper paragraphs

Return only the email content, no additional formatting or explanations.`;

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
        buildingContext,
        recipient,
        subject
      }
    });

  } catch (error: any) {
    console.error('Error in generate-new-email-draft:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 