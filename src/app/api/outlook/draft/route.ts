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
  generateToneAwareReplyTemplate,
  detectTopic
} from '@/lib/outlook/reply-utils';

export async function POST(req: NextRequest): Promise<NextResponse<DraftResponse | { error: string }>> {
  try {
    const body = DraftRequestSchema.parse(await req.json());

    // Detect topic if not provided
    const topic = body.topicHint || detectTopic(body.originalMessageSummary);

    // Use user tone override or detected tone, default to neutral
    const toneLabel = body.userToneOverride || body.tone?.label || 'neutral';
    const escalationRequired = body.tone?.escalationRequired || false;

    // Log tone override if applicable
    if (body.userToneOverride && body.tone) {
      console.log('📊 Tone override:', {
        detected: body.tone.label,
        override: body.userToneOverride,
        confidence: body.tone.confidence,
        topic
      });
    }

    // Build enrichment object for template
    const enrichment = {
      residentName: body.residentName,
      unitLabel: body.unitLabel,
      buildingName: body.buildingName,
      facts: body.facts
    };

    // Generate the draft using tone-aware template system
    const draft = generateToneAwareReplyTemplate(
      enrichment,
      body.originalMessageSummary,
      toneLabel,
      escalationRequired
    );

    // Calculate metadata
    const factCount = Object.values(body.facts).filter(value =>
      value !== null && value !== undefined && value !== ''
    ).length;

    const empathyLevel = determineEmpathyLevel(toneLabel, body.originalMessageSummary);

    const metadata = {
      topic,
      empathyLevel,
      factCount,
      detectedTone: body.tone?.label,
      appliedTone: toneLabel,
      toneOverridden: body.userToneOverride !== undefined,
      escalationRequired
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
 * Determine empathy level based on tone and message content
 */
function determineEmpathyLevel(
  tone: string,
  messageSummary: string
): 'standard' | 'high' | 'urgent' {
  const text = messageSummary.toLowerCase();

  // Tone-based empathy mapping
  if (tone === 'abusive') {
    return 'urgent'; // Always urgent for abusive tone
  }

  if (tone === 'angry') {
    return 'high'; // High empathy for angry tone
  }

  // Check content for urgency indicators
  if (
    text.includes('emergency') ||
    text.includes('urgent') ||
    text.includes('immediate') ||
    text.includes('safety') ||
    text.includes('danger') ||
    text.includes('flooding') ||
    text.includes('major')
  ) {
    return 'urgent';
  }

  // High empathy indicators
  if (
    tone === 'concerned' ||
    text.includes('worried') ||
    text.includes('problem') ||
    text.includes('issue') ||
    text.includes('damage')
  ) {
    return 'high';
  }

  return 'standard';
}