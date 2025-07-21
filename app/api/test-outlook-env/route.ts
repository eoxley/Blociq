import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const outlookEnv = {
    OUTLOOK_CLIENT_ID: !!process.env.OUTLOOK_CLIENT_ID,
    OUTLOOK_CLIENT_SECRET: !!process.env.OUTLOOK_CLIENT_SECRET,
    OUTLOOK_REDIRECT_URI: process.env.OUTLOOK_REDIRECT_URI,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    OUTLOOK_TENANT_ID: process.env.OUTLOOK_TENANT_ID || 'common'
  };
  
  return NextResponse.json({
    outlookEnv,
    allConfigured: outlookEnv.OUTLOOK_CLIENT_ID && outlookEnv.OUTLOOK_CLIENT_SECRET && outlookEnv.OUTLOOK_REDIRECT_URI,
    environment: process.env.NODE_ENV
  });
} 