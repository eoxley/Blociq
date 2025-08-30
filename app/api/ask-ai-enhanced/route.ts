import { NextRequest, NextResponse } from 'next/server';

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Redirect to the main ask-ai endpoint
  const body = await req.json();
  
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ask-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  const data = await response.json();
  return NextResponse.json(data);
}