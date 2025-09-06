import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { parseAddinIntent } from '@/ai/intent/parseAddinIntent';
import { buildAddinPrompt } from '@/ai/prompt/addinPrompt';
import { addinQAAdapter } from '@/ai/adapters/addinQAAdapter';
import { addinReplyAdapter } from '@/ai/adapters/addinReplyAdapter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { subject, from, to, cc, bodyPreview, buildingId, unitId, intent } = body;
    
    if (!subject || !from || !intent) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: subject, from, intent'
      }, { status: 400 });
    }

    // Ensure intent is REPLY
    if (intent !== 'REPLY') {
      return NextResponse.json({
        success: false,
        message: 'Intent must be REPLY for generate-reply endpoint'
      }, { status: 400 });
    }

    // Get user from session
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    // Build Outlook context for the AI
    const outlookContext = {
      from,
      subject,
      receivedDateTime: new Date().toISOString(),
      bodyPreview: bodyPreview || '',
      to: to || [],
      cc: cc || []
    };

    // Build building/unit context if provided
    let buildingContext = null;
    if (buildingId || unitId) {
      buildingContext = {
        buildingId: buildingId || null,
        unitId: unitId || null
      };
    }

    // Use the existing addin reply adapter
    const replyResult = await addinReplyAdapter({
      userInput: 'Generate a professional reply to this email',
      outlookContext,
      buildingContext,
      userId: user.id
    });

    if (!replyResult.success) {
      return NextResponse.json({
        success: false,
        message: replyResult.message || 'Failed to generate reply'
      }, { status: 500 });
    }

    // Return the reply in the expected format
    return NextResponse.json({
      success: true,
      draftHtml: replyResult.bodyHtml,
      subjectSuggestion: replyResult.subjectSuggestion || `Re: ${subject}`,
      usedFacts: replyResult.usedFacts || [],
      sources: replyResult.sources || []
    });

  } catch (error) {
    console.error('Error in generate-reply endpoint:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}