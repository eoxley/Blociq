import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const test = url.searchParams.get("test");

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.blociq.co.uk";

  try {
    console.log("🛠️ Callback route triggered");
    
    if (test) {
      return NextResponse.json({ status: "callback is alive ✅" });
    }

    if (!code) {
      console.warn("⚠️ No code found in query string.");
      return NextResponse.redirect(`${baseUrl}/inbox?error=no_code`);
    }

    console.log("✅ Code received:", code);
    return NextResponse.redirect(`${baseUrl}/inbox?status=received`);

  } catch (err) {
    console.error("🔥 Uncaught callback error:", err);
    return new Response("Server error", { status: 500 });
  }
} 