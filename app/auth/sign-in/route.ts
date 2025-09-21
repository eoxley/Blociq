import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!;
const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://www.blociq.co.uk'
  : 'http://localhost:3000';
const REDIRECT_URI = encodeURIComponent(`${BASE_URL}/api/auth/outlook/callback`);
const SCOPES = encodeURIComponent(
  "openid profile email offline_access Mail.Read Mail.Send Calendars.ReadWrite"
);

export async function GET(req: NextRequest) {
  const tenantId = process.env.AZURE_TENANT_ID || 'common';
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&response_mode=query&scope=${SCOPES}&prompt=select_account`;

  return NextResponse.redirect(url);
} 