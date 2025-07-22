import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  
  // Handle both old format (email_id) and new format (emailContent)
  const body = await req.json();
  const { email_id, building_id, emailContent } = body;

  // Get the current user's session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!email_id && !emailContent) {
    return NextResponse.json({ error: 'Either email_id or emailContent is required' }, { status: 400 });
  }

  try {
    let emailData;
    let buildingContext = '';

    if (email_id) {
      // Fetch the email from Supabase
      const { data: email, error: fetchError } = await supabase
        .from('incoming_emails')
        .select(`
          subject, 
          body_full, 
          body_preview, 
          from_name, 
          from_email, 
          building_id,
          tags,
          buildings(name)
        `)
        .eq('id', email_id)
        .single();

      if (fetchError || !email) {
        console.error('Email not found:', fetchError?.message);
        return NextResponse.json({ error: 'Email not found' }, { status: 404 });
      }

      emailData = email;
      
      // Get building context if available
      if (email.buildings?.name) {
        buildingContext = `Building: ${email.buildings.name}`;
      }
    } else {
      // Use provided emailContent
      emailData = emailContent;
      if (emailContent.buildingId) {
        buildingContext = `Building: ${emailContent.buildingId}`;
      }
    }

    // Prepare the email content for reply generation
    const emailContentForPrompt = email_id ? `
Original Email:
From: ${emailData.from_name || 'Unknown'} (${emailData.from_email || 'No email'})
Subject: ${emailData.subject || 'No Subject'}
${buildingContext}

Content:
${emailData.body_full || emailData.body_preview || 'No content available'}
    `.trim() : `
Original Email:
From: ${emailData.from || 'Unknown'} (${emailData.fromName || 'No name'})
Subject: ${emailData.subject || 'No Subject'}
${buildingContext}

Content:
${emailData.body || 'No content available'}
    `.trim();

    // Create the prompt for OpenAI
    const systemPrompt = `You are a professional property management assistant using British English. Generate a professional, courteous, and helpful reply to the email below.

Guidelines:
- Be professional but friendly and approachable using British English
- Address the sender's concerns directly
- Provide clear, actionable responses
- Use a tone appropriate for property management
- Include relevant building context if available
- Be concise but thorough
- End with a professional closing using "Kind regards" or similar British formalities
- If the email requires follow-up action, mention next steps
- If it's a complaint, acknowledge the issue and show empathy
- If it's a request, provide clear information or timeline
- Use British English spelling throughout (e.g., analyse, summarise, organise, recognise, apologise, customise, centre, defence)
- Format dates as DD/MM/YYYY (British format)
- Use British terminology and expressions appropriate for UK property management`;

    const userPrompt = `Generate a professional reply to this email for a property manager:

${emailContentForPrompt}

Please create a reply that:
1. Acknowledges the sender appropriately
2. Addresses their specific concerns or questions
3. Provides clear, helpful information
4. Uses a professional but friendly tone
5. Includes relevant building context if applicable
6. Ends with a professional closing

Return only the reply content, formatted as a proper email response.`;

    // Call OpenAI for reply generation
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
      max_tokens: 500,
      temperature: 0.7,
    });

    const draftReply = completion.choices[0]?.message?.content || 'Unable to generate reply draft';

    // Log the reply generation for analytics
    try {
      await supabase.from('email_reply_drafts').insert({
        email_id: email_id,
        user_id: session.user.id,
        draft_content: draftReply,
        building_id: building_id || (emailData?.building_id),
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Error logging reply draft:', logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({ 
      success: true,
      reply: draftReply,
      context: {
        original_email: emailData,
        building_name: emailData?.buildings?.name
      }
    });

  } catch (error) {
    console.error('Error generating email reply:', error);
    return NextResponse.json({ 
      error: 'Failed to generate reply draft',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 