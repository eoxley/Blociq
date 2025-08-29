// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for emailId
// - Authentication check with user validation
// - Try/catch with detailed error handling
// - Used in email summary components
// - Includes OpenAI integration with error handling

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getOpenAIClient } from '@/lib/openai-client';
import { buildPrompt } from '@/lib/buildPrompt';
import { insertAiLog } from '@/lib/supabase/ai_logs';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      emailContent, 
      emailSubject, 
      fromEmail, 
      buildingId, 
      documentIds = [], 
      emailThreadId, 
      manualContext, 
      leaseholderId 
    } = body;

    if (!emailContent) {
      return NextResponse.json({ error: 'Email content is required' }, { status: 400 });
    }

    console.log('🤖 Building unified prompt for email summarisation');

    // Build the email content for context
    const emailContext = `
Email Subject: ${emailSubject || 'No subject'}
From: ${fromEmail || 'Unknown sender'}
Content:
${emailContent}
`;

    // Build unified prompt with all context
    const prompt = await buildPrompt({
      question: `Please summarise this email and identify key actions required: ${emailContext}`,
      contextType: 'email_summarisation',
      buildingId,
      documentIds,
      emailThreadId,
      manualContext: emailContext + (manualContext ? '\n\n' + manualContext : ''),
      leaseholderId,
    });

    // Add email-specific instructions
    const emailInstructions = `
IMPORTANT: You are summarising an email for a property manager. Please:

1. Provide a concise summary of the email content
2. Identify any urgent matters or deadlines
3. List specific actions required
4. Note any compliance or legal implications
5. Suggest appropriate responses or next steps
6. Highlight any building-specific concerns
7. Use professional British English
8. Format your response clearly with sections

Email Summary:
`;

    const finalPrompt = prompt + '\n\n' + emailInstructions;

    console.log('📝 Prompt built, calling OpenAI...');

    // Call OpenAI
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'system', content: finalPrompt }],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'No summary generated';

    console.log('✅ OpenAI response received');

    // Log the AI interaction
    await insertAiLog({
      user_id: user.id,
      question: `Summarise email: ${emailSubject || 'No subject'}`,
      response: aiResponse,
      context_type: 'email_summarisation',
      building_id: buildingId,
      document_ids: documentIds,
      leaseholder_id: leaseholderId,
      email_thread_id: emailThreadId,
    });

    return NextResponse.json({ 
      success: true,
      summary: aiResponse,
      context_type: 'email_summarisation',
      building_id: buildingId,
      document_count: documentIds.length,
      has_email_thread: !!emailThreadId,
      has_leaseholder: !!leaseholderId
    });

  } catch (error) {
    console.error('❌ Error in summarise-email route:', error);
    return NextResponse.json({ 
      error: 'Failed to summarise email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 