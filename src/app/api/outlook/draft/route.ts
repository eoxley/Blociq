/**
 * API route for generating empathetic, context-aware email draft replies
 * Input: resident info, building info, facts, original message summary
 * Output: empathetic UK-tone draft with inserted facts and next steps
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  DraftRequestSchema,
  DraftResponse,
  TopicHint
} from '@/lib/outlook/reply-types';
import {
  generateReplyTemplate,
  detectTopic
} from '@/lib/outlook/reply-utils';

export async function POST(req: NextRequest): Promise<NextResponse<DraftResponse | { error: string }>> {
  try {
    const body = DraftRequestSchema.parse(await req.json());

    // Detect topic if not provided
    const topic = body.topicHint || detectTopic(body.originalMessageSummary);

    // Build enrichment object for template
    const enrichment = {
      residentName: body.residentName,
      unitLabel: body.unitLabel,
      buildingName: body.buildingName,
      facts: body.facts
    };

    // Generate the draft using our template system
    const draft = generateReplyTemplate(enrichment, body.originalMessageSummary);

    // Calculate metadata
    const factCount = Object.values(body.facts).filter(value =>
      value !== null && value !== undefined && value !== ''
    ).length;

    const empathyLevel = determineEmpathyLevel(topic, body.originalMessageSummary);

    const metadata = {
      topic,
      empathyLevel,
      factCount
    };

    return NextResponse.json({ draft, metadata }, { status: 200 });

  } catch (error: unknown) {
    console.error('Draft API error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to generate draft' },
      { status: 400 }
    );
  }
}

/**
 * Determine empathy level based on topic and message content
 */
function determineEmpathyLevel(
  topic: TopicHint,
  messageSummary: string
): 'standard' | 'high' | 'urgent' {
  const text = messageSummary.toLowerCase();

  // Urgent indicators
  if (
    text.includes('emergency') ||
    text.includes('urgent') ||
    text.includes('immediate') ||
    text.includes('safety') ||
    text.includes('danger') ||
    (topic === 'fire' && (text.includes('alarm') || text.includes('smoke'))) ||
    (topic === 'leak' && (text.includes('flooding') || text.includes('major')))
  ) {
    return 'urgent';
  }

  // High empathy indicators
  if (
    topic === 'fire' ||
    topic === 'leak' ||
    text.includes('concern') ||
    text.includes('worried') ||
    text.includes('problem') ||
    text.includes('issue') ||
    text.includes('damage')
  ) {
    return 'high';
  }

  return 'standard';
}