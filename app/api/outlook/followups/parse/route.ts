// app/api/outlook/followups/parse/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { detectPromises } from '@/lib/addin/promises';

export interface ParseRequest {
  draft: string;
}

export type ParseResult = {
  matchedText: string;
  dueAtISO: string;
  humanLabel: string;
  type: string;
} | null;

export async function POST(request: NextRequest) {
  try {
    const body: ParseRequest = await request.json();
    const { draft } = body;

    if (!draft) {
      return NextResponse.json({
        success: false,
        error: 'Draft text is required'
      }, { status: 400 });
    }

    const promiseMatch = detectPromises(draft);

    return NextResponse.json({
      success: true,
      data: promiseMatch
    });

  } catch (error) {
    console.error('Error parsing promises:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to parse promises'
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