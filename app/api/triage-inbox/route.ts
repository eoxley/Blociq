import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { OpenAI } from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 1: Get all untriaged inbox emails
    const { data: emails, error: emailsError } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('user_id', user.id)
      .is('triaged', null) // triaged = boolean
      .limit(25)

    if (emailsError) {
      console.error('❌ Error fetching emails:', emailsError)
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 })
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json({ summary: 'No new emails to triage.' })
    }

    const triageResults = []
    const draftsToSave = []
    const urgentIds = []
    const suggestedActions = []

    // Step 2: Process each email with AI
    for (const email of emails) {
      try {
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
`

        const aiResponse = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4
        })

        const responseContent = aiResponse.choices[0]?.message?.content
        if (!responseContent) {
          console.error('❌ No response from OpenAI for email:', email.id)
          continue
        }

        let parsed
        try {
          parsed = JSON.parse(responseContent)
        } catch (parseError) {
          console.error('❌ Failed to parse AI response for email:', email.id, parseError)
          continue
        }

        // Mark urgent emails
        if (parsed.is_urgent) {
          urgentIds.push(email.id)
        }

        // Save draft reply
        if (parsed.draft_reply) {
          draftsToSave.push({
            email_id: email.id,
            user_id: user.id,
            triage_category: parsed.triage_category || 'General',
            draft_text: parsed.draft_reply,
            confidence_score: 0.95,
            created_at: new Date().toISOString()
          })
        }

        // Queue suggested actions
        if (Array.isArray(parsed.suggested_action)) {
          suggestedActions.push(...parsed.suggested_action.map((action: any) => ({
            ...action,
            related_email_id: email.id,
            user_id: user.id,
            created_at: new Date().toISOString()
          })))
        }

        // Store result for UI return
        triageResults.push({
          email_id: email.id,
          subject: email.subject || 'No subject',
          category: parsed.triage_category || 'General',
          is_urgent: parsed.is_urgent || false
        })

      } catch (error) {
        console.error('❌ Error processing email:', email.id, error)
      }
    }

    // Step 3: Save all data to database
    try {
      // Save AI generated drafts
      if (draftsToSave.length > 0) {
        const { error: draftsError } = await supabase
          .from('ai_generated_drafts')
          .insert(draftsToSave)
        
        if (draftsError) {
          console.error('❌ Error saving drafts:', draftsError)
        }
      }

      // Mark urgent emails
      if (urgentIds.length > 0) {
        const { error: urgentError } = await supabase
          .from('incoming_emails')
          .update({ is_urgent: true, triaged: true })
          .in('id', urgentIds)
        
        if (urgentError) {
          console.error('❌ Error marking urgent emails:', urgentError)
        }
      }

      // Mark non-urgent emails as triaged
      const nonUrgentIds = emails.map(e => e.id).filter(id => !urgentIds.includes(id))
      if (nonUrgentIds.length > 0) {
        const { error: triagedError } = await supabase
          .from('incoming_emails')
          .update({ triaged: true })
          .in('id', nonUrgentIds)
        
        if (triagedError) {
          console.error('❌ Error marking emails as triaged:', triagedError)
        }
      }

      // Save suggested actions
      if (suggestedActions.length > 0) {
        const { error: actionsError } = await supabase
          .from('suggested_building_actions')
          .insert(suggestedActions)
        
        if (actionsError) {
          console.error('❌ Error saving suggested actions:', actionsError)
        }
      }

    } catch (dbError) {
      console.error('❌ Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save triage results' }, { status: 500 })
    }

    // Step 4: Return summary for UI
    return NextResponse.json({
      summary: `✅ Inbox triaged: ${emails.length} scanned`,
      drafts_ready: draftsToSave.length,
      urgent_count: urgentIds.length,
      actions: suggestedActions.length,
      triageResults
    })

  } catch (error) {
    console.error('❌ Error in triage-inbox API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 