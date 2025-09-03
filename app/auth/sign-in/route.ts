import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!;
const REDIRECT_URI = encodeURIComponent("https://www.blociq.co.uk/auth/callback");
const SCOPES = encodeURIComponent(
  "openid profile email offline_access Mail.Read Mail.Send Calendars.ReadWrite"
);

export async function GET(req: NextRequest) {
  const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&response_mode=query&scope=${SCOPES}&prompt=select_account`;

  return NextResponse.redirect(url);
} 