import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { email, marketingConsent } = await req.json();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const { data: lead, error: upErr } = await supabaseAdmin
      .from("leads")
      .upsert(
        { email, marketing_consent: !!marketingConsent, source: "landing_public_chat" },
        { onConflict: "email" }
      )
      .select()
      .single();
    if (upErr) throw upErr;

    const { data: session, error: sErr } = await supabaseAdmin
      .from("chat_sessions")
      .insert({
        email,
        lead_id: lead?.id ?? null,
        source: "landing_public_chat",
        user_agent: (typeof navigator === "undefined" ? null : null) // keep server-clean
      })
      .select()
      .single();
    if (sErr) throw sErr;

    return NextResponse.json({ sessionId: session.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to start session" }, { status: 500 });
  }
}
