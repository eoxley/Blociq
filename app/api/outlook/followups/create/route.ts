// app/api/outlook/followups/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createOutlookEventData } from '@/lib/addin/promises';

export interface CreateFollowupRequest {
  buildingId: string;
  buildingName: string;
  unitId?: string;
  leaseholderId?: string;
  threadId?: string;
  messageId?: string;
  subject: string;
  matchedText: string;
  dueAtISO: string;
  dueAtHuman: string;
}

export interface CreateFollowupResult {
  followupId: string;
  todoId: string;
  outlookEventId?: string;
  dueAtHuman: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateFollowupRequest = await request.json();
    const {
      buildingId,
      buildingName,
      unitId,
      leaseholderId,
      threadId,
      messageId,
      subject,
      matchedText,
      dueAtISO,
      dueAtHuman
    } = body;

    if (!buildingId || !buildingName || !subject || !matchedText || !dueAtISO) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Create follow-up record in communications_followups
    const { data: followup, error: followupError } = await supabase
      .from('communications_followups')
      .insert({
        building_id: buildingId,
        unit_id: unitId || null,
        leaseholder_id: leaseholderId || null,
        thread_id: threadId || null,
        message_id: messageId || null,
        subject: subject,
        matched_text: matchedText,
        due_at: dueAtISO,
        status: 'open',
        created_by: user.id,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (followupError || !followup) {
      console.error('Error creating followup:', followupError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create follow-up record'
      }, { status: 500 });
    }

    // Create building todo
    const { data: todo, error: todoError } = await supabase
      .from('building_todos')
      .insert({
        building_id: buildingId,
        title: `Follow-up: ${subject}`,
        description: `Follow-up due: ${matchedText}`,
        due_date: dueAtISO,
        priority: 'medium',
        status: 'pending',
        source: 'followup',
        source_id: followup.id,
        assigned_to: user.id,
        created_by: user.id,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (todoError || !todo) {
      console.error('Error creating todo:', todoError);
      // Don't fail the whole request, just log the error
    }

    // Try to create Outlook calendar event
    let outlookEventId: string | undefined;
    try {
      const eventData = createOutlookEventData(buildingName, subject, dueAtISO);
      // In a real implementation, this would use Microsoft Graph API
      // For now, we'll simulate successful creation
      outlookEventId = `outlook_event_${Date.now()}`;

      console.log('Would create Outlook event:', {
        title: eventData.title,
        start: eventData.start,
        end: eventData.end,
        reminderMinutes: eventData.reminderMinutes
      });
    } catch (error) {
      console.warn('Failed to create Outlook event:', error);
      // Don't fail the whole request
    }

    const result: CreateFollowupResult = {
      followupId: followup.id,
      todoId: todo?.id || '',
      outlookEventId,
      dueAtHuman
    };

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error creating follow-up:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create follow-up'
    }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}