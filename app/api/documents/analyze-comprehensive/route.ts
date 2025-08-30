import { NextRequest, NextResponse } from 'next/server';

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return NextResponse.json({
    error: 'Comprehensive document analysis endpoint temporarily disabled during OCR integration'
  }, { status: 503 });
}
