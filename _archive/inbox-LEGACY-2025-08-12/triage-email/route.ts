import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email_id } = await req.json();

    if (!email_id) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
    }

    // Get the specific email
    const { data: email, error: emailError } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('id', email_id)
      .eq('user_id', user.id)
      .single();

    if (emailError || !email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Process the email with AI
    const prompt = `
You are a leasehold block management assistant. Your job is to categorise and respond to incoming leaseholder emails.

Please return JSON in this format:
{
  "triage_category": "Complaints" | "S20" | "Service Charge" | "Maintenance" | "Insurance" | "Lease Query" | "General",
  "is_urgent": true | false,
  "suggested_action": [
    { "type": "note" | "event" | "todo", "content": "string", "building_id": "optional" }
  ],
  "draft_reply": "AI-generated professional email reply"
}

Here is the email:
Subject: ${email.subject || 'No subject'}
Body:
${email.body_full || email.body_preview || 'No content'}

Special instructions:
- If the email refers to repairs, highlight urgency and suggest adding a building event.
- If the email is threatening legal action or service charge withholding, mark as urgent and generate a complaint draft.
- For maintenance issues, consider creating a building event or todo.
- For complaints, create a note and potentially mark as urgent.
- For S20 notices, create a todo with appropriate follow-up timeline.
- For insurance queries, create a note and potentially a todo for follow-up.
- For lease queries, create a note for documentation.
- For service charge issues, assess urgency and create appropriate action items.
`;

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4
    });

    const responseContent = aiResponse.choices[0]?.message?.content;
    if (!responseContent) {
      return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 });
    }

    let parsed;
    try {
      parsed = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Update the email with triage results
    const { error: updateError } = await supabase
      .from('incoming_emails')
      .update({
        triage_category: parsed.triage_category || 'General',
        is_urgent: parsed.is_urgent || false,
        triaged: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', email_id);

    if (updateError) {
      console.error('Error updating email:', updateError);
      return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
    }

    // Save draft reply if generated
    if (parsed.draft_reply) {
      const { error: draftError } = await supabase
        .from('ai_generated_drafts')
        .insert({
          email_id: email_id,
          user_id: user.id,
          triage_category: parsed.triage_category || 'General',
          draft_text: parsed.draft_reply,
          confidence_score: 0.95,
          created_at: new Date().toISOString()
        });

      if (draftError) {
        console.error('Error saving draft:', draftError);
      }
    }

    // Save suggested actions
    if (Array.isArray(parsed.suggested_action)) {
      const actions = parsed.suggested_action.map((action: any) => ({
        ...action,
        related_email_id: email_id,
        user_id: user.id,
        created_at: new Date().toISOString()
      }));

      const { error: actionsError } = await supabase
        .from('suggested_building_actions')
        .insert(actions);

      if (actionsError) {
        console.error('Error saving suggested actions:', actionsError);
      }
    }

    return NextResponse.json({
      success: true,
      triage_category: parsed.triage_category,
      is_urgent: parsed.is_urgent,
      draft_reply: parsed.draft_reply,
      suggested_actions: parsed.suggested_action
    });

  } catch (error) {
    console.error('Error in triage-email API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 