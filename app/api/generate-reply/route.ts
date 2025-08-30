// ✅ ENHANCED GENERATE REPLY API
// - Supports both emailId and direct content input
// - Includes building context for better responses
// - Enhanced error handling and validation
// - Professional UK leasehold property management responses

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import OpenAI from 'openai';

interface GenerateReplyRequest {
  emailId?: string;
  subject?: string;
  body?: string;
  categories?: string[];
  flag_status?: string;
  from_email?: string;
  prompt?: string;
  action?: 'reply' | 'reply-all' | 'forward';
}

export async function POST(req: NextRequest) {
  try {
    const { emailId, subject, body, categories, flag_status, from_email, prompt, action }: GenerateReplyRequest = await req.json();
    
    if (!emailId && !subject && !body && !prompt) {
      return NextResponse.json({ error: 'Email ID or content is required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch email details if emailId is provided
    let emailData = { subject, body, categories, flag_status, from_email, building_id: null, message_id: null };
    if (emailId) {
      // First try to get the email from Microsoft Graph for full context
      try {
        // Get user's Outlook token
        const { data: tokens } = await supabase
          .from('outlook_tokens')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (tokens?.access_token) {
          // Get the email from Supabase first to get the message_id
          const { data: localEmail } = await supabase
            .from('incoming_emails')
            .select('*')
            .eq('id', emailId)
            .eq('user_id', user.id)
            .single();

          if (localEmail?.message_id) {
            const graphResponse = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${localEmail.message_id}`, {
              headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'Content-Type': 'application/json',
              },
            });

            if (graphResponse.ok) {
              const graphEmail = await graphResponse.json();
              emailData = {
                subject: graphEmail.subject || localEmail.subject || undefined,
                body: graphEmail.body?.content || localEmail.body_full || localEmail.body_preview || undefined,
                categories: graphEmail.categories || localEmail.categories || undefined,
                flag_status: graphEmail.flag?.flagStatus || localEmail.flag_status || undefined,
                from_email: graphEmail.from?.emailAddress?.address || localEmail.from_email || undefined,
                building_id: localEmail.building_id || null,
                message_id: localEmail.message_id
              };
            } else {
              // Use local data if Graph fails
              emailData = {
                subject: localEmail.subject || undefined,
                body: localEmail.body_full || localEmail.body_preview || undefined,
                categories: localEmail.categories || undefined,
                flag_status: localEmail.flag_status || undefined,
                from_email: localEmail.from_email || undefined,
                building_id: localEmail.building_id || null,
                message_id: localEmail.message_id
              };
            }
          } else {
            // Use local data if no message_id
            emailData = {
              subject: localEmail.subject || undefined,
              body: localEmail.body_full || localEmail.body_preview || undefined,
              categories: localEmail.categories || undefined,
              flag_status: localEmail.flag_status || undefined,
              from_email: localEmail.from_email || undefined,
              building_id: localEmail.building_id || null,
              message_id: localEmail.message_id
            };
          }
        } else {
          // Fallback to Supabase if no token
          const { data: email, error } = await supabase
            .from('incoming_emails')
            .select('*')
            .eq('id', emailId)
            .eq('user_id', user.id)
            .single();

          if (error) {
            console.error('Error fetching email:', error);
            return NextResponse.json({ error: 'Email not found' }, { status: 404 });
          }
          
          if (email) {
            emailData = {
              subject: email.subject || undefined,
              body: email.body_full || email.body_preview || undefined,
              categories: email.categories || undefined,
              flag_status: email.flag_status || undefined,
              from_email: email.from_email || undefined,
              building_id: email.building_id || null,
              message_id: email.message_id
            };
          }
        }
      } catch (error) {
        console.error('Error fetching email data:', error);
        return NextResponse.json({ error: 'Failed to fetch email data' }, { status: 500 });
      }
    }

    // Optional: fetch building details for context
    let buildingContext = "";
    if (emailData.building_id) {
      const { data: building } = await supabase
        .from("buildings")
        .select("name, unit_count, address")
        .eq("id", emailData.building_id)
        .maybeSingle();

      if (building) {
        buildingContext = `This email is related to the building "${building.name}", which contains ${building.unit_count || 'an unknown number of'} units. Address: ${building.address || 'Not specified'}.\n`;
      }
    }

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured');
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build context-aware prompt based on email tags and status
    const tagContext = buildTagContext(emailData.categories || [], emailData.flag_status || null);
    const urgencyContext = emailData.flag_status === 'flagged' ? 'URGENT - This email has been flagged as requiring immediate attention.' : '';
    const actionContext = action === 'reply-all' ? 'This is a reply-all response. Consider all recipients and ensure the response is appropriate for the entire group.' : 
                         action === 'forward' ? 'This is a forwarded message. Provide context for the recipient about why this is being forwarded.' : 
                         'This is a direct reply to the sender.';
    
    const systemPrompt = `You are an expert UK leasehold property manager. Write a professional and empathetic email ${action || 'reply'} to the message below. Use appropriate tone and reference building context if relevant.

${buildingContext}
${tagContext}
${actionContext}

Guidelines:
- Use a professional, courteous, and helpful tone using British English
- Address the specific concerns mentioned in the email
- Provide clear, actionable responses
- Be empathetic to leaseholder concerns
- Include next steps or follow-up actions when appropriate
- Keep responses concise but comprehensive
- Use appropriate formality based on the email context
- Reference building details when relevant to provide context
- End with a professional closing using "Kind regards" or similar British formalities
${urgencyContext ? `- ${urgencyContext}` : ''}
- Consider the full email chain context when crafting your response
- If this is a reply to a complex issue, acknowledge previous correspondence
- Provide specific, actionable next steps with timelines when possible

Response Structure:
1. Acknowledge the concern/request (and previous correspondence if applicable)
2. Provide relevant information or solution
3. Outline next steps or timeline
4. Offer additional support if needed
5. Professional closing using British formalities

Use British English spelling throughout (e.g., analyse, summarise, organise, recognise, apologise, customise, centre, defence) and format dates as DD/MM/YYYY.`;

    const userPrompt = prompt || `Generate a professional ${action || 'reply'} to this email:

Subject: ${emailData.subject || 'No subject'}
From: ${emailData.from_email || 'Unknown sender'}
Content: ${emailData.body || 'No content available'}

Please provide a helpful and professional response that addresses the sender's concerns. If this is related to a specific building, reference the building context appropriately. Consider the full email chain and provide context-aware responses.`;

    let generatedReply = '';
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      generatedReply = completion.choices[0]?.message?.content || '';

      if (!generatedReply) {
        console.error('❌ OpenAI returned empty response');
        return NextResponse.json({ error: 'Failed to generate reply - empty response' }, { status: 500 });
      }

      console.log('✅ AI reply generated successfully');
    } catch (openaiError: any) {
      console.error('❌ OpenAI API error:', openaiError);
      
      if (openaiError.status === 401) {
        return NextResponse.json({ error: 'AI service authentication failed' }, { status: 500 });
      } else if (openaiError.status === 429) {
        return NextResponse.json({ error: 'AI service rate limit exceeded' }, { status: 429 });
      } else {
        return NextResponse.json({ 
          error: 'AI service error', 
          details: openaiError.message || 'Unknown OpenAI error'
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      response: generatedReply,
      context: {
        tags: emailData.categories,
        flag_status: emailData.flag_status,
        urgency: emailData.flag_status === 'flagged',
        building_id: emailData.building_id,
        building_context: buildingContext,
        action: action || 'reply',
        message_id: emailData.message_id
      }
    });

  } catch (error: any) {
    console.error('Error in generate-reply:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to build context based on email tags
function buildTagContext(categories: string[], flagStatus: string | null): string {
  const contextParts = [];
  
  if (categories.includes('Urgent')) {
    contextParts.push('This is an URGENT matter requiring immediate attention and quick response.');
  }
  
  if (categories.includes('Compliance')) {
    contextParts.push('This involves compliance or regulatory matters. Be thorough and reference relevant policies or regulations.');
  }
  
  if (categories.includes('Leaseholder')) {
    contextParts.push('This is a leaseholder concern. Be empathetic and provide clear guidance on lease-related matters.');
  }
  
  if (categories.includes('Maintenance')) {
    contextParts.push('This is a maintenance request. Provide clear timeline and next steps for resolution.');
  }
  
  if (categories.includes('Financial')) {
    contextParts.push('This involves financial matters. Be precise with numbers and payment terms.');
  }
  
  if (categories.includes('Legal')) {
    contextParts.push('This involves legal matters. Be careful with language and suggest professional consultation if needed.');
  }
  
  if (categories.includes('Emergency')) {
    contextParts.push('This is an EMERGENCY situation. Prioritize safety and immediate action.');
  }
  
  if (categories.includes('Routine')) {
    contextParts.push('This is a routine matter. Provide standard information and procedures.');
  }
  
  if (flagStatus === 'flagged') {
    contextParts.push('This email has been flagged for special attention. Ensure thorough and prompt response.');
  }
  
  return contextParts.length > 0 
    ? `Context: ${contextParts.join(' ')}`
    : 'This is a general inquiry. Provide helpful and professional assistance.';
} 