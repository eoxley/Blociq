import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { parseAddinIntent } from '@/ai/intent/parseAddinIntent';
import { buildReplyPrompt } from '@/ai/prompt/addinPrompt';
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

    // Resolve building/unit context from Supabase if provided
    let buildingContext = null;
    let leaseSummary = null;

    if (buildingId || unitId) {
      try {
        // Get building details
        if (buildingId) {
          const { data: buildingData, error: buildingError } = await supabase
            .from('buildings')
            .select('id, name, address')
            .eq('id', buildingId)
            .single();

          if (buildingData) {
            buildingContext = {
              buildingId: buildingData.id,
              buildingName: buildingData.name,
              address: buildingData.address
            };
          }
        }

        // Get unit details if provided
        if (unitId) {
          const { data: unitData, error: unitError } = await supabase
            .from('units')
            .select('id, unit_number, building_id')
            .eq('id', unitId)
            .single();

          if (unitData) {
            buildingContext = {
              ...buildingContext,
              unitId: unitData.id,
              unitNumber: unitData.unit_number
            };
          }
        }

        // Try to get lease summary data from document_jobs for this building/unit
        if (buildingId) {
          const { data: leaseJobs, error: leaseError } = await supabase
            .from('document_jobs')
            .select('summary_json')
            .eq('linked_building_id', buildingId)
            .eq('status', 'READY')
            .not('summary_json', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(1);

          if (leaseJobs && leaseJobs.length > 0) {
            leaseSummary = leaseJobs[0].summary_json;
          }
        }

      } catch (error) {
        console.error('Error resolving building/unit context:', error);
        // Continue without context
      }
    }

    // Use the existing addin reply adapter with resolved context
    const replyResult = await addinReplyAdapter({
      userInput: 'Generate a professional reply to this email',
      outlookContext,
      buildingContext,
      leaseSummary,
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