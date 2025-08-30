import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

export const runtime = "nodejs";

interface BulkTriageRequest {
  emails: Array<{
    id: string;
    subject: string | null;
    body: string | null;
    from: string | null;
    receivedAt: string | null;
    buildingId?: string | null;
  }>;
  performActions?: boolean; // New flag to control whether to perform actions
}

interface TriageResult {
  emailId: string;
  urgency: 'critical' | 'high' | 'medium' | 'low' | 'none';
  actionRequired: 'immediate' | 'today' | 'this_week' | 'no_action' | 'file';
  category: string;
  summary: string;
  suggestedActions: string[];
  tags: string[];
  estimatedResponseTime: string;
  actionsPerformed?: {
    markedAsRead: boolean;
    categorized: boolean;
    tagged: boolean;
    statusUpdated: boolean;
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emails, performActions = true }: BulkTriageRequest = await req.json();

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: 'No emails provided' }, { status: 400 });
    }

    console.log(`🔄 Starting bulk triage for ${emails.length} emails. Perform actions: ${performActions}`);

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const results: TriageResult[] = [];

    // Process emails in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      // Process batch concurrently
      const batchPromises = batch.map(async (email) => {
        try {
          const systemPrompt = `You are an expert property management triage specialist using British English. 
          Analyse emails for urgency, action requirements, and provide comprehensive triage information.
          
          Guidelines:
          - Use British English spelling and terminology
          - Assess urgency based on content, tone, and context
          - Determine appropriate action timeline
          - Provide clear, actionable insights
          - Consider property management context
          - Format response in structured sections`;
          
          const userPrompt = `Analyse this property management email for triage purposes:
          
          Subject: ${email.subject || 'No subject'}
          From: ${email.from || 'Unknown sender'}
          Content: ${email.body || 'No content'}
          Received: ${email.receivedAt || 'Unknown date'}
          
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

          const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: 800
          });

          const result = completion.choices[0].message.content;
          const parsedResult = parseTriageResult(result);

          // Perform actions on the email if requested
          let actionsPerformed = {
            markedAsRead: false,
            categorized: false,
            tagged: false,
            statusUpdated: false
          };

          if (performActions) {
            try {
              // Mark email as read
              await supabase
                .from('incoming_emails')
                .update({ 
                  is_read: true,
                  updated_at: new Date().toISOString()
                })
                .eq('id', email.id);
              actionsPerformed.markedAsRead = true;

              // Update email with triage information
              const updateData: any = {
                updated_at: new Date().toISOString()
              };

              // Add category if it's a valid one
              if (parsedResult.category && parsedResult.category !== 'General') {
                updateData.category = parsedResult.category;
                actionsPerformed.categorized = true;
              }

              // Add tags
              if (parsedResult.tags && parsedResult.tags.length > 0) {
                updateData.tags = parsedResult.tags;
                actionsPerformed.tagged = true;
              }

              // Update status based on action required
              if (parsedResult.actionRequired === 'immediate' || parsedResult.actionRequired === 'today') {
                updateData.status = 'urgent';
                actionsPerformed.statusUpdated = true;
              } else if (parsedResult.actionRequired === 'this_week') {
                updateData.status = 'pending';
                actionsPerformed.statusUpdated = true;
              } else if (parsedResult.actionRequired === 'no_action' || parsedResult.actionRequired === 'file') {
                updateData.status = 'filed';
                updateData.is_handled = true;
                actionsPerformed.statusUpdated = true;
              }

              // Update urgency level
              updateData.urgency = parsedResult.urgency;
              actionsPerformed.statusUpdated = true;

              // Update the email with triage data
              await supabase
                .from('incoming_emails')
                .update(updateData)
                .eq('id', email.id);

              console.log(`✅ Actions performed for email ${email.id}:`, actionsPerformed);

            } catch (actionError) {
              console.error(`❌ Error performing actions for email ${email.id}:`, actionError);
            }
          }

          return {
            emailId: email.id,
            ...parsedResult,
            actionsPerformed
          };

        } catch (error) {
          console.error(`Error processing email ${email.id}:`, error);
          return {
            emailId: email.id,
            urgency: 'medium' as const,
            actionRequired: 'this_week' as const,
            category: 'Error',
            summary: 'Failed to analyse email',
            suggestedActions: ['Review manually'],
            tags: ['error'],
            estimatedResponseTime: 'Unknown',
            actionsPerformed: {
              markedAsRead: false,
              categorized: false,
              tagged: false,
              statusUpdated: false
            }
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid rate limits
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Log the bulk triage operation
    try {
      const actionsSummary = results.reduce((acc, result) => {
        if (result.actionsPerformed) {
          acc.markedAsRead += result.actionsPerformed.markedAsRead ? 1 : 0;
          acc.categorized += result.actionsPerformed.categorized ? 1 : 0;
          acc.tagged += result.actionsPerformed.tagged ? 1 : 0;
          acc.statusUpdated += result.actionsPerformed.statusUpdated ? 1 : 0;
        }
        return acc;
      }, { markedAsRead: 0, categorized: 0, tagged: 0, statusUpdated: 0 });

      await supabase
        .from('ai_logs')
        .insert({
          user_id: user.id,
          question: `Bulk triage of ${emails.length} emails`,
          response: `Processed ${results.length} emails successfully. Actions performed: ${JSON.stringify(actionsSummary)}`,
          timestamp: new Date().toISOString(),
        });
    } catch (logError) {
      console.error('Failed to log AI interaction:', logError);
      // Don't fail the request if logging fails
    }

    console.log(`🎉 Bulk triage completed for ${results.length} emails`);

    return NextResponse.json({
      success: true,
      results,
      totalProcessed: results.length,
      actionsPerformed: performActions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Bulk Triage error:', error);
    return NextResponse.json({
      error: 'Failed to process bulk triage',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function parseTriageResult(result: string): Omit<TriageResult, 'emailId' | 'actionsPerformed'> {
  const lines = result.split('\n');
  const parsed = {
    urgency: 'medium' as 'critical' | 'high' | 'medium' | 'low' | 'none',
    actionRequired: 'this_week' as 'immediate' | 'today' | 'this_week' | 'no_action' | 'file',
    category: 'General',
    summary: '',
    suggestedActions: [] as string[],
    tags: [] as string[],
    estimatedResponseTime: '24 hours'
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('Urgency:')) {
      const urgency = trimmedLine.split('Urgency:')[1]?.trim().toLowerCase();
      if (urgency?.includes('critical')) parsed.urgency = 'critical';
      else if (urgency?.includes('high')) parsed.urgency = 'high';
      else if (urgency?.includes('low')) parsed.urgency = 'low';
      else if (urgency?.includes('none')) parsed.urgency = 'none';
    }
    
    if (trimmedLine.startsWith('Action Required:')) {
      const action = trimmedLine.split('Action Required:')[1]?.trim().toLowerCase();
      if (action?.includes('immediate')) parsed.actionRequired = 'immediate';
      else if (action?.includes('today')) parsed.actionRequired = 'today';
      else if (action?.includes('no action') || action?.includes('file')) parsed.actionRequired = 'no_action';
    }
    
    if (trimmedLine.startsWith('Category:')) {
      parsed.category = trimmedLine.split('Category:')[1]?.trim() || 'General';
    }
    
    if (trimmedLine.startsWith('Summary:')) {
      parsed.summary = trimmedLine.split('Summary:')[1]?.trim() || '';
    }
    
    if (trimmedLine.startsWith('Suggested Actions:')) {
      const actions = trimmedLine.split('Suggested Actions:')[1]?.trim();
      parsed.suggestedActions = actions ? actions.split(',').map(a => a.trim()) : [];
    }
    
    if (trimmedLine.startsWith('Tags:')) {
      const tags = trimmedLine.split('Tags:')[1]?.trim();
      parsed.tags = tags ? tags.split(',').map(t => t.trim()) : [];
    }
    
    if (trimmedLine.startsWith('Estimated Response Time:')) {
      parsed.estimatedResponseTime = trimmedLine.split('Estimated Response Time:')[1]?.trim() || '24 hours';
    }
  }

  return parsed;
} 