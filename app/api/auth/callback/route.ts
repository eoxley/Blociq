import { NextRequest, NextResponse } from "next/server";
import { getAccessTokenFromCode } from "@/lib/outlook";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    console.error("❌ No auth code received from Microsoft");
    return NextResponse.redirect("/inbox?error=no_code");
  }

  try {
    console.log("🔁 Exchanging code for token...");
    const tokenResponse = await getAccessTokenFromCode(code);
    console.log("✅ Token received:", tokenResponse);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Must be correct
    );

    const insertData = {
      user_id: "debug-id-123", // TEMP static user for testing
      email: "debug@blociq.co.uk", // TEMP test email
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_at: Date.now() + tokenResponse.expires_in * 1000,
    };

    console.log("📝 Inserting token to Supabase:", insertData);

    const { error } = await supabase.from("outlook_tokens").insert(insertData);

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return NextResponse.redirect("/inbox?error=insert_failed");
    }

    console.log("✅ Token saved successfully!");
    return NextResponse.redirect("/inbox?status=connected");

  } catch (err) {
    console.error("❌ Auth error:", err);
    return NextResponse.redirect("/inbox?error=auth_failed");
  }
} 