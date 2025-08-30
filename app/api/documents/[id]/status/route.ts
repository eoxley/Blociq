import { NextRequest, NextResponse } from 'next/server';

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    error: 'Document status endpoint temporarily disabled during OCR integration'
  }, { status: 503 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    error: 'Document status endpoint temporarily disabled during OCR integration'
  }, { status: 503 });
}
