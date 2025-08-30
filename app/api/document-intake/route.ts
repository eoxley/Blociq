import { NextRequest, NextResponse } from 'next/server';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return NextResponse.json({
    error: 'Document intake endpoint temporarily disabled during OCR integration'
  }, { status: 503 });
}
