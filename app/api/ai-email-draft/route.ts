import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getOpenAIClient } from '@/lib/openai-client';

interface EmailDraftRequest {
  emailId: string;
  draftType: 'reply' | 'follow-up' | 'notification' | 'escalation' | 'resolution';
  context?: {
    buildingId?: string;
    buildingName?: string;
    leaseholderName?: string;
    unitNumber?: string;
    previousEmails?: any[];
  };
  options?: {
    tone?: 'professional' | 'friendly' | 'formal' | 'empathetic' | 'firm';
    length?: 'brief' | 'standard' | 'detailed';
    includeLegal?: boolean;
    includeNextSteps?: boolean;
    includeDeadlines?: boolean;
    customInstructions?: string;
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

    const { emailId, draftType, context, options }: EmailDraftRequest = await req.json();

    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
    }

    // Fetch the original email
    const { data: originalEmail, error: emailError } = await supabase
      .from('incoming_emails')
      .select(`
        id, subject, from_email, body_preview, received_at, handled, unread, tag, building_id, thread_id
      `)
      .eq('id', emailId)
      .single();

    if (emailError || !originalEmail) {
      console.error('Error fetching email:', emailError);
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Fetch previous emails in the same thread if available
    let threadEmails: any[] = [];
    if (originalEmail.thread_id) {
      const { data: threadData } = await supabase
        .from('incoming_emails')
        .select(`
          id, subject, from_email, body_preview, received_at, handled
        `)
        .eq('thread_id', originalEmail.thread_id)
        .order('received_at', { ascending: true });
      
      threadEmails = threadData || [];
    }

    // Fetch building context
    let buildingContext = '';
    if (originalEmail.building_id) {
      const { data: building } = await supabase
        .from('buildings')
        .select('name, address, building_manager_name, building_manager_email')
        .eq('id', originalEmail.building_id)
        .single();
      
      if (building) {
        buildingContext = `
Building: ${building.name}
Address: ${building.address || 'Not specified'}
Building Manager: ${building.building_manager_name || 'Not specified'}
Manager Email: ${building.building_manager_email || 'Not specified'}`;
      }
    }

    // Initialize OpenAI
    const openai = getOpenAIClient();

    // Build context-aware system prompt
    const systemPrompt = `You are a professional property management assistant specialising in UK leasehold management. 
    Create professional, clear, and legally appropriate email responses using British English spelling and formatting.
    
    Building Context:${buildingContext}
    
    Guidelines:
    - Use a ${options?.tone || 'professional'} tone
    - Be clear, concise, and actionable
    - ${options?.includeLegal ? 'Include relevant legal references when appropriate' : 'Focus on practical solutions'}
    - Structure the message logically with proper paragraphs
    - End with a professional closing using "Kind regards" or similar British formalities
    - ${options?.includeNextSteps ? 'Include specific next steps and timelines' : 'Provide clear guidance'}
    - ${options?.includeDeadlines ? 'Include specific deadlines when relevant' : 'Be responsive to urgency'}
    - Consider the building context and previous communications
    - Address the sender's concerns appropriately
    - Maintain professional standards throughout
    - Use British English spelling throughout (e.g., analyse, summarise, organise, recognise, apologise, customise, centre, defence)
    - Format dates as DD/MM/YYYY (British format)
    - Use British terminology and expressions appropriate for UK property management
    
    ${options?.customInstructions ? `Custom Instructions: ${options.customInstructions}` : ''}`;

    // Build user prompt based on draft type
    let userPrompt = '';

    switch (draftType) {
      case 'reply':
        userPrompt = `Generate a ${options?.length || 'standard'} reply to this email:
        
Original Email:
Subject: ${originalEmail.subject}
From: ${originalEmail.from_email}
Received: ${new Date(originalEmail.received_at || '').toLocaleString()}
Content: ${originalEmail.body_preview}

${threadEmails.length > 1 ? `Previous emails in thread: ${threadEmails.length - 1}` : 'No previous emails in thread'}

Please create a professional response that:
1. Acknowledges the sender's concerns
2. Provides a clear, helpful response
3. Includes appropriate next steps
4. Maintains professional tone
5. Addresses any specific issues mentioned`;
        break;

      case 'follow-up':
        userPrompt = `Generate a ${options?.length || 'standard'} follow-up email:
        
Original Email:
Subject: ${originalEmail.subject}
From: ${originalEmail.from_email}
Received: ${new Date(originalEmail.received_at || '').toLocaleString()}
Content: ${originalEmail.body_preview}

Status: ${originalEmail.handled ? 'Handled' : 'Pending'}

Please create a follow-up email that:
1. References the original communication
2. Provides an update on progress
3. Sets clear expectations for next steps
4. Maintains professional relationship
5. Encourages continued communication if needed`;
        break;

      case 'notification':
        userPrompt = `Generate a ${options?.length || 'standard'} notification email:
        
Regarding:
Subject: ${originalEmail.subject}
From: ${originalEmail.from_email}
Content: ${originalEmail.body_preview}

Please create a notification email that:
1. Clearly communicates important information
2. Provides necessary details and context
3. Includes any required actions
4. Sets appropriate expectations
5. Uses professional but accessible language`;
        break;

      case 'escalation':
        userPrompt = `Generate a ${options?.length || 'standard'} escalation email:
        
Issue:
Subject: ${originalEmail.subject}
From: ${originalEmail.from_email}
Content: ${originalEmail.body_preview}

Please create an escalation email that:
1. Acknowledges the seriousness of the issue
2. Explains the escalation process
3. Provides timeline for resolution
4. Maintains professional tone while showing urgency
5. Includes appropriate contact information for follow-up`;
        break;

      case 'resolution':
        userPrompt = `Generate a ${options?.length || 'standard'} resolution email:
        
Resolved Issue:
Subject: ${originalEmail.subject}
From: ${originalEmail.from_email}
Content: ${originalEmail.body_preview}

Please create a resolution email that:
1. Confirms the issue has been resolved
2. Provides details of the solution
3. Thanks the sender for their patience
4. Includes any follow-up information
5. Maintains positive relationship`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid draft type' }, { status: 400 });
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: options?.length === 'detailed' ? 1500 : options?.length === 'standard' ? 1000 : 500
    });

    const draft = completion.choices[0].message.content;

    // Save the draft to database using our drafts API
    try {
      const draftData = {
        type: 'email',
        subject: `${draftType} - ${originalEmail.subject}`,
        recipient: originalEmail.from_email,
        building_id: null, // Will be extracted from context if available
        content: draft,
        context: JSON.stringify({
          original_email_id: emailId,
          original_subject: originalEmail.subject,
          original_from: originalEmail.from_email,
          draft_type: draftType,
          ai_generated: true,
          timestamp: new Date().toISOString()
        })
      };

      // Save to our drafts API
      const saveResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/drafts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draftData),
      });

      if (!saveResponse.ok) {
        console.error('Failed to save draft to drafts API:', saveResponse.status);
      } else {
        console.log('Successfully saved draft to drafts API');
      }
    } catch (draftError) {
      console.error('Failed to save draft:', draftError);
    }

    // Log the AI interaction
    try {
      await supabase
        .from('ai_logs')
        .insert({
          user_id: user.id,
          question: `${draftType} draft for email: ${originalEmail.subject}`,
          response: draft,
          timestamp: new Date().toISOString(),
        });
    } catch (logError) {
      console.error('Failed to log AI interaction:', logError);
    }

    return NextResponse.json({
      success: true,
      draftType,
      draft,
      emailId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Email Draft error:', error);
    return NextResponse.json({
      error: 'Failed to generate email draft',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 