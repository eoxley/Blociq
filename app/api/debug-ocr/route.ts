import { NextRequest, NextResponse } from 'next/server';

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'OCR debug endpoint temporarily disabled during OCR integration'
  }, { status: 503 });
}

export async function GET() {
  return NextResponse.json({
    message: 'OCR Debug endpoint temporarily disabled during OCR integration'
  });
}