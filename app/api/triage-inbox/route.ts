import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

interface TriageResult {
  email_id: string;
  category: string;
  urgency: 'low' | 'medium' | 'high';
  confidence: number;
  draft?: string;
  suggested_actions?: Array<{
    type: 'note' | 'todo' | 'event';
    content: string;
    building_id?: string;
  }>;
}

interface TriageResponse {
  summary: string;
  urgent_ids: string[];
  suggested_tags: string[];
  draft_emails: Array<{
    email_id: string;
    draft: string;
    category: string;
    confidence: number;
  }>;
  suggested_actions: Array<{
    type: 'note' | 'todo' | 'event';
    content: string;
    building_id?: string;
  }>;
  triage_results: TriageResult[];
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get unread/untriaged emails
    const { data: emails, error: emailsError } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('user_id', user.id)
      .or('unread.eq.true,is_read.eq.false,ai_tag.is.null')
      .order('received_at', { ascending: false })
      .limit(50); // Limit to prevent timeout

    if (emailsError) {
      console.error('❌ Error fetching emails:', emailsError);
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json({
        summary: 'No emails to triage',
        urgent_ids: [],
        suggested_tags: [],
        draft_emails: [],
        suggested_actions: [],
        triage_results: []
      });
    }

    // AI Triage Analysis
    const triageResults: TriageResult[] = [];
    const draftEmails: Array<{
      email_id: string;
      draft: string;
      category: string;
      confidence: number;
    }> = [];
    const suggestedActions: Array<{
      type: 'note' | 'todo' | 'event';
      content: string;
      building_id?: string;
    }> = [];
    const allTags = new Set<string>();
    const urgentIds: string[] = [];

    // Process each email with AI
    for (const email of emails) {
      try {
        // AI Classification
        const classificationResponse = await fetch('/api/generate-draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emailId: email.id,
            prompt_type: 'triage',
            email_content: email.body_full || email.body_preview || '',
            email_subject: email.subject || '',
            from_email: email.from_email || ''
          }),
        });

        if (classificationResponse.ok) {
          const classificationData = await classificationResponse.json();
          
          const category = classificationData.category || 'general';
          const urgency = classificationData.urgency || 'medium';
          const confidence = classificationData.confidence || 0.7;
          
          allTags.add(category);
          
          if (urgency === 'high') {
            urgentIds.push(email.id);
          }

          const triageResult: TriageResult = {
            email_id: email.id,
            category,
            urgency,
            confidence
          };

          // Generate draft reply for actionable emails
          if (confidence > 0.6 && category !== 'general') {
            const draftResponse = await fetch('/api/generate-draft', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                emailId: email.id,
                prompt_type: 'reply',
                email_content: email.body_full || email.body_preview || '',
                email_subject: email.subject || '',
                from_email: email.from_email || ''
              }),
            });

            if (draftResponse.ok) {
              const draftData = await draftResponse.json();
              triageResult.draft = draftData.draft;
              
              draftEmails.push({
                email_id: email.id,
                draft: draftData.draft,
                category,
                confidence
              });

              // Save draft to database
              await supabase
                .from('ai_generated_drafts')
                .upsert({
                  email_id: email.id,
                  draft_text: draftData.draft,
                  category,
                  confidence,
                  created_at: new Date().toISOString()
                });
            }
          }

          // Generate suggested actions
          if (category === 'leak' || category === 'maintenance') {
            suggestedActions.push({
              type: 'event',
              content: `${category} issue reported in ${email.subject}`,
              building_id: email.building_id?.toString()
            });
          } else if (category === 'complaint') {
            suggestedActions.push({
              type: 'note',
              content: `Complaint: ${email.subject}`,
              building_id: email.building_id?.toString()
            });
          } else if (category === 's20' || category === 'insurance') {
            suggestedActions.push({
              type: 'todo',
              content: `Follow up on ${category}: ${email.subject}`,
              building_id: email.building_id?.toString()
            });
          }

          triageResults.push(triageResult);

          // Update email with AI tag
          await supabase
            .from('incoming_emails')
            .update({ 
              ai_tag: category,
              triage_category: category
            })
            .eq('id', email.id);

        } else {
          console.error('❌ Error classifying email:', email.id);
        }
      } catch (error) {
        console.error('❌ Error processing email:', email.id, error);
      }
    }

    // Generate summary
    const summary = `${emails.length} emails scanned • ${urgentIds.length} marked urgent • ${draftEmails.length} draft replies ready`;

    const response: TriageResponse = {
      summary,
      urgent_ids: urgentIds,
      suggested_tags: Array.from(allTags),
      draft_emails: draftEmails,
      suggested_actions: suggestedActions,
      triage_results: triageResults
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error in triage-inbox API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 