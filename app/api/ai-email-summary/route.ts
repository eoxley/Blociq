import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

interface EmailSummaryRequest {
  emailIds: string[];
  summaryType: 'thread' | 'conversation' | 'action-items' | 'timeline';
  includeContext?: boolean;
  maxLength?: 'brief' | 'standard' | 'detailed';
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emailIds, summaryType, includeContext = true, maxLength = 'standard' }: EmailSummaryRequest = await req.json();

    if (!emailIds || emailIds.length === 0) {
      return NextResponse.json({ error: 'Email IDs are required' }, { status: 400 });
    }

    // Fetch emails from database
    const { data: emails, error: emailsError } = await supabase
      .from('incoming_emails')
      .select(`
        id, subject, from_email, body_preview, received_at, handled, unread, ai_tag, building_id
      `)
      .in('id', emailIds)
      .order('received_at', { ascending: true });

    if (emailsError) {
      console.error('Error fetching emails:', emailsError);
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: 'No emails found' }, { status: 404 });
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build email content for AI analysis
    const emailContent = emails.map((email, index) => `
Email ${index + 1}:
Date: ${new Date(email.received_at || '').toLocaleString()}
From: ${email.from_email}
Subject: ${email.subject}
Content: ${email.body_preview}
Status: ${email.handled ? 'Handled' : 'Pending'} | ${email.unread ? 'Unread' : 'Read'}
Tag: ${email.ai_tag || 'None'}
---`).join('\n\n');

    // Build context if requested
    let contextInfo = '';
    if (includeContext && emails[0]?.building_id) {
      const { data: building } = await supabase
        .from('buildings')
        .select('name, address')
        .eq('id', emails[0].building_id)
        .single();
      
      if (building) {
        contextInfo = `\nBuilding Context: ${building.name} - ${building.address || 'No address'}`;
      }
    }

    // Create system prompt based on summary type
    let systemPrompt = '';
    let userPrompt = '';

    switch (summaryType) {
      case 'thread':
        systemPrompt = `You are an expert at summarising email threads for property managers using British English. 
        Create a clear, chronological summary that shows the progression of the conversation.`;
        
        userPrompt = `Summarise this email thread in a ${maxLength} format using British English:
        
${emailContent}
${contextInfo}

Provide:
1. Chronological progression of the conversation
2. Key points discussed
3. Current status and any pending issues
4. Next steps or actions needed`;
        break;

      case 'conversation':
        systemPrompt = `You are an expert at analysing email conversations for property managers using British English. 
        Focus on the communication flow, tone, and relationship dynamics.`;
        
        userPrompt = `Analyse this email conversation using British English:
        
${emailContent}
${contextInfo}

Provide:
1. Communication flow and tone analysis
2. Key topics discussed
3. Relationship dynamics between parties
4. Resolution status
5. Communication effectiveness`;
        break;

      case 'action-items':
        systemPrompt = `You are an expert at extracting action items from email threads for property managers using British English. 
        Focus on tasks, deadlines, and required responses.`;
        
        userPrompt = `Extract action items from this email thread using British English:
        
${emailContent}
${contextInfo}

Provide:
1. List of specific action items
2. Deadlines mentioned (if any)
3. Priority levels
4. Responsible parties
5. Follow-up requirements`;
        break;

      case 'timeline':
        systemPrompt = `You are an expert at creating timelines from email threads for property managers. 
        Focus on chronological events and milestones.`;
        
        userPrompt = `Create a timeline from this email thread:
        
${emailContent}
${contextInfo}

Provide:
1. Chronological timeline of events
2. Key milestones
3. Response times
4. Resolution timeline
5. Any delays or issues`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid summary type' }, { status: 400 });
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: maxLength === 'detailed' ? 1500 : maxLength === 'standard' ? 1000 : 500
    });

    const summary = completion.choices[0].message.content;

    // Log the AI interaction
    try {
      await supabase
        .from('ai_logs')
        .insert({
          user_id: user.id,
          question: `${summaryType} summary for ${emails.length} emails`,
          response: summary,
          timestamp: new Date().toISOString(),
        });
    } catch (logError) {
      console.error('Failed to log AI interaction:', logError);
    }

    return NextResponse.json({
      success: true,
      summaryType,
      emailCount: emails.length,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Email Summary error:', error);
    return NextResponse.json({
      error: 'Failed to generate email summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 