import { NextRequest, NextResponse } from 'next/server';

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Safe environment variable check (no secrets exposed)
  const envCheck = {
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    USE_DOCUMENT_AI: process.env.USE_DOCUMENT_AI,
    DOCUMENT_AI_PROCESSOR_ID: !!process.env.DOCUMENT_AI_PROCESSOR_ID,
    DOCUMENT_AI_LOCATION: process.env.DOCUMENT_AI_LOCATION || 'not-set',
    GOOGLE_CLOUD_PROJECT_ID: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
    GOOGLE_APPLICATION_CREDENTIALS_JSON: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    GOOGLE_VISION_API_KEY: !!process.env.GOOGLE_VISION_API_KEY,
    GOOGLE_CLOUD_API_KEY: !!process.env.GOOGLE_CLOUD_API_KEY,
    GOOGLE_CLOUD_ACCESS_TOKEN: !!process.env.GOOGLE_CLOUD_ACCESS_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    deployment_url: req.nextUrl.origin
  };

  console.log('🔍 Environment diagnostic check:', envCheck);

  return NextResponse.json({
    message: 'Environment diagnostic check',
    environment: envCheck,
    timestamp: new Date().toISOString()
  });
}