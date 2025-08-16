import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { sessionId, role, content, tokenCount } = await req.json();
    if (!sessionId || !role || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!["user", "assistant", "system"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from("chat_messages")
      .insert({ session_id: sessionId, role, content, token_count: tokenCount ?? null });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to log message" }, { status: 500 });
  }
}
