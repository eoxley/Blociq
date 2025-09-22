/**
 * API route for parsing promises from email drafts
 * Input: { draft: string }
 * Output: { promises: PromiseMatch[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { detectPromises, PromiseMatch } from '@/lib/outlook/promise-detection';

const ParseRequestSchema = z.object({
  draft: z.string().min(1, 'Draft text is required'),
});

export interface ParseResponse {
  promises: PromiseMatch[];
  totalMatches: number;
}

export async function POST(req: NextRequest): Promise<NextResponse<ParseResponse | { error: string }>> {
  try {
    const body = ParseRequestSchema.parse(await req.json());

    console.log('🔍 Parsing promises from draft text...');

    // Detect promises using our utility function
    const promises = detectPromises(body.draft);

    console.log(`✨ Found ${promises.length} promises:`, promises.map(p => ({
      text: p.matchedText,
      due: p.humanLabel,
      type: p.type
    })));

    const response: ParseResponse = {
      promises,
      totalMatches: promises.length
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: unknown) {
    console.error('❌ Promise parsing error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: `Validation error: ${error.errors.map(e => e.message).join(', ')}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: (error as Error).message || 'Failed to parse promises' },
      { status: 500 }
    );
  }
}