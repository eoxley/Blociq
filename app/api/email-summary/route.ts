import { NextRequest, NextResponse } from 'next/server';

// Redirect email-summary requests to ai-email-summary
export async function GET(req: NextRequest) {
  const url = new URL('/api/ai-email-summary', req.url);
  // Forward any query parameters
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url);
}

export async function POST(req: NextRequest) {
  const url = new URL('/api/ai-email-summary', req.url);
  return NextResponse.redirect(url);
}