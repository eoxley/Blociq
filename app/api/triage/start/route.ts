import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { listInboxMessages, getAccessTokenForUser } from "@/lib/outlook/graph";
import { classifyEmailForTriage } from "@/lib/ai/triage";

export async function POST(req: Request) {
  try {
    const { batchSize = 10, dryRun = false, inbox_user_id } = await req.json();
    const { data: run, error } = await supabaseAdmin
      .from("ai_triage_runs")
      .insert({ batch_size: batchSize, dry_run: dryRun, status: "planned" })
      .select().single();
    if (error) throw error;

    const token = await getAccessTokenForUser(inbox_user_id);
    const messages = await listInboxMessages(token, 50);

    const planned = [];
    for (const m of messages.slice(0, 50)) {
      const tri = await classifyEmailForTriage({
        subject: m.subject || "", from: m.from?.emailAddress?.address, preview: m.bodyPreview
      });
      if (!tri) continue;
      planned.push({
        run_id: run.id,
        message_id: m.id,
        conversation_id: m.conversationId,
        internet_message_id: m.internetMessageId,
        category: tri.label,
        reason: tri.reason,
        due_date: tri.due_date || null
      });
    }

    if (planned.length) {
      await supabaseAdmin.from("ai_triage_actions").insert(planned);
      await supabaseAdmin.from("ai_triage_runs").update({ total: planned.length }).eq("id", run.id);
    }

    return NextResponse.json({ run_id: run.id, planned: planned.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to start triage" }, { status: 500 });
  }
}
