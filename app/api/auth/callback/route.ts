import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const test = url.searchParams.get("test");

    console.log("🛠️ Callback route triggered");
    if (test) {
      return NextResponse.json({ status: "callback is alive ✅" });
    }

    if (!code) {
      console.warn("⚠️ No code found in query string.");
      return NextResponse.redirect("/inbox?error=no_code");
    }

    // You can put the real token exchange + Supabase logic here later
    console.log("✅ Code received:", code);
    return NextResponse.redirect("/inbox?status=received");

  } catch (err) {
    console.error("🔥 Uncaught callback error:", err);
    return new Response("Server error", { status: 500 });
  }
} 