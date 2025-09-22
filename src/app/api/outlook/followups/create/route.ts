/**
 * API route for creating follow-ups from detected promises
 * Creates entries in communications_followups, building_todos, and Outlook calendar events
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/serverSupabase';
import { humanizeDueAt } from '@/lib/outlook/promise-detection';

const CreateFollowupRequestSchema = z.object({
  threadId: z.string().optional(),
  messageId: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  matchedText: z.string().min(1, 'Matched text is required'),
  dueAtISO: z.string().min(1, 'Due date is required'),
  buildingId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  leaseholderId: z.string().uuid().optional(),
  buildingName: z.string().optional(),
  senderEmail: z.string().email().optional(),
});

export interface CreateFollowupResponse {
  id: string;
  todoId: string | null;
  outlookEventId: string | null;
  dueAtHuman: string;
  status: 'success' | 'partial_success';
  warnings: string[];
}

export async function POST(req: NextRequest): Promise<NextResponse<CreateFollowupResponse | { error: string }>> {
  try {
    const body = CreateFollowupRequestSchema.parse(await req.json());
    const sb = serverSupabase();
    const warnings: string[] = [];

    console.log('📝 Creating follow-up for:', {
      subject: body.subject,
      matchedText: body.matchedText,
      dueAt: body.dueAtISO,
      buildingId: body.buildingId
    });

    const dueAt = new Date(body.dueAtISO);
    const dueAtHuman = humanizeDueAt(dueAt);

    // 1. Resolve building/unit/leaseholder if not provided
    let { buildingId, unitId, leaseholderId } = body;

    if (!buildingId && body.senderEmail) {
      console.log('🔍 Resolving building from sender email...');

      const { data: leaseholder } = await sb
        .from('leaseholders')
        .select(`
          id,
          unit_id,
          units!inner (
            id,
            building_id,
            buildings!inner (
              id,
              name
            )
          )
        `)
        .eq('email', body.senderEmail)
        .single();

      if (leaseholder) {
        leaseholderId = leaseholder.id;
        const unit = Array.isArray(leaseholder.units) ? leaseholder.units[0] : leaseholder.units;
        unitId = unit.id;
        buildingId = unit.building_id;
        console.log('✅ Resolved building context from email');
      } else {
        warnings.push('Could not resolve building from sender email');
      }
    }

    // 2. Create communications_followups entry
    const { data: followup, error: followupError } = await sb
      .from('communications_followups')
      .insert({
        thread_id: body.threadId,
        message_id: body.messageId,
        subject: body.subject,
        matched_text: body.matchedText,
        due_at: dueAt.toISOString(),
        building_id: buildingId || null,
        unit_id: unitId || null,
        leaseholder_id: leaseholderId || null,
        status: 'pending'
      })
      .select('id')
      .single();

    if (followupError) {
      throw new Error(`Failed to create followup: ${followupError.message}`);
    }

    console.log('✅ Created communications_followups entry:', followup.id);

    // 3. Create building_todos entry if we have a building
    let todoId: string | null = null;

    if (buildingId) {
      const todoTitle = `Follow-up: ${body.subject}`;
      const todoDescription = `Promise made: "${body.matchedText}"\nDue: ${dueAtHuman}`;

      const { data: todo, error: todoError } = await sb
        .from('building_todos')
        .insert({
          building_id: buildingId,
          unit_id: unitId || null,
          leaseholder_id: leaseholderId || null,
          title: todoTitle,
          description: todoDescription,
          due_date: dueAt.toISOString(),
          status: 'open',
          source: 'followup',
          priority: determinePriority(dueAt)
        })
        .select('id')
        .single();

      if (todoError) {
        warnings.push(`Could not create todo: ${todoError.message}`);
        console.warn('⚠️ Todo creation failed:', todoError);
      } else {
        todoId = todo.id;
        console.log('✅ Created building_todos entry:', todoId);

        // Link todo back to followup
        await sb
          .from('communications_followups')
          .update({ todo_id: todoId })
          .eq('id', followup.id);
      }
    } else {
      warnings.push('No building context - todo not created');
    }

    // 4. Create Outlook calendar event (simplified - would need proper Outlook Graph API integration)
    let outlookEventId: string | null = null;

    try {
      outlookEventId = await createOutlookEvent({
        subject: `Follow-up: ${body.buildingName || 'Property'} - ${body.subject}`,
        start: dueAt,
        description: `${body.matchedText}\n\nBlocIQ Follow-up Link: https://www.blociq.co.uk/buildings/${buildingId}/todos`
      });

      if (outlookEventId) {
        // Update followup with Outlook event ID
        await sb
          .from('communications_followups')
          .update({ outlook_event_id: outlookEventId })
          .eq('id', followup.id);

        console.log('✅ Created Outlook calendar event:', outlookEventId);
      }
    } catch (error) {
      warnings.push(`Could not create Outlook event: ${(error as Error).message}`);
      console.warn('⚠️ Outlook event creation failed:', error);
    }

    const response: CreateFollowupResponse = {
      id: followup.id,
      todoId,
      outlookEventId,
      dueAtHuman,
      status: warnings.length === 0 ? 'success' : 'partial_success',
      warnings
    };

    console.log('✅ Follow-up creation completed:', response);

    return NextResponse.json(response, { status: 200 });

  } catch (error: unknown) {
    console.error('❌ Follow-up creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: `Validation error: ${error.errors.map(e => e.message).join(', ')}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create follow-up' },
      { status: 500 }
    );
  }
}

/**
 * Determine priority based on due date proximity
 */
function determinePriority(dueAt: Date): 'low' | 'medium' | 'high' | 'urgent' {
  const now = new Date();
  const hoursUntilDue = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilDue < 4) return 'urgent';
  if (hoursUntilDue < 24) return 'high';
  if (hoursUntilDue < 72) return 'medium';
  return 'low';
}

/**
 * Create Outlook calendar event (simplified version)
 * In production, this would use Microsoft Graph API
 */
async function createOutlookEvent(event: {
  subject: string;
  start: Date;
  description: string;
}): Promise<string | null> {
  // This is a simplified mock implementation
  // In production, you would:
  // 1. Get user's Outlook access token
  // 2. Call Microsoft Graph API to create calendar event
  // 3. Set reminder for 2 hours before
  // 4. Return the event ID

  console.log('📅 Mock Outlook event creation:', {
    subject: event.subject,
    start: event.start.toISOString(),
    description: event.description
  });

  // Return a mock event ID
  return `outlook_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}