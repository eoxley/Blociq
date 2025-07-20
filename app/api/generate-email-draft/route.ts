import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { subject, recipient, building_id, context } = await req.json();

  // Get the current user's session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!subject) {
    return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
  }

  try {
    // Get building context if available
    let buildingContext = '';
    if (building_id) {
      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .select('name, building_type, age')
        .eq('id', building_id)
        .single();

      if (!buildingError && building) {
        buildingContext = `
Building: ${building.name}
${building.building_type ? `Building Type: ${building.building_type}` : ''}
${building.age ? `Building Age: ${building.age}` : ''}
        `.trim();
      }
    }

    // Create the prompt for OpenAI
    const systemPrompt = `You are a professional property management assistant. Generate a professional, clear, and helpful email message based on the subject and context provided.

Guidelines:
- Use a professional but friendly tone appropriate for property management
- Be clear, concise, and actionable
- Include relevant building context if provided
- Structure the message logically with proper paragraphs
- End with a professional closing
- If it's about maintenance, provide clear timelines and next steps
- If it's about compliance, reference relevant regulations
- If it's about financial matters, be precise with numbers and terms
- If it's about emergencies, prioritize safety and immediate action
- Make the message personal and relevant to the recipient`;

    const userPrompt = `Draft a professional message from a property manager to the recipient based on the subject:

Subject: "${subject}"
${recipient ? `Recipient: ${recipient}` : ''}
${buildingContext ? `Building Context:\n${buildingContext}` : ''}
${context ? `Additional Context: ${context}` : ''}

Please create a message that:
1. Addresses the subject appropriately
2. Uses a professional but approachable tone
3. Provides clear, actionable information
4. Includes relevant building context if applicable
5. Has a proper greeting and closing
6. Is structured with clear paragraphs
7. Provides specific next steps or timelines when relevant

Return only the message content, formatted as a proper email body.`;

    // Call OpenAI for draft generation
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    const draftContent = completion.choices[0]?.message?.content || 'Unable to generate draft content';

    // Log the draft generation for analytics
    try {
      await supabase.from('email_drafts').insert({
        user_id: session.user.id,
        subject: subject,
        recipient: recipient || null,
        building_id: building_id || null,
        draft_content: draftContent,
        context: context || null,
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Error logging email draft:', logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({ 
      success: true,
      draft: draftContent,
      context: {
        subject,
        recipient,
        building_context: buildingContext
      }
    });

  } catch (error) {
    console.error('Error generating email draft:', error);
    return NextResponse.json({ 
      error: 'Failed to generate email draft',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 