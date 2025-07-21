import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const nextPublicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/outlook/callback`;
  
  return NextResponse.json({
    NEXT_PUBLIC_SITE_URL: nextPublicSiteUrl,
    constructedRedirectUri: redirectUri,
    isAbsoluteUri: redirectUri?.startsWith('http'),
    environment: process.env.NODE_ENV
  });
} 