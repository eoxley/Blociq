import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAccessTokenForUser, patchMessage, createReplyDraft } from "@/lib/outlook/graph";
import { detectDocRequest } from "@/lib/ai/detectDocRequest";
import { getLatestDoc } from "@/lib/docs/getLatest";

function patchForCategory(cat: string, due?: string) {
  if (cat === "urgent") return {
    categories: ["Urgent"],
    importance: "high",
    flag: { flagStatus: "flagged" }
  };
  if (cat === "follow_up") return {
    categories: ["Follow up"],
    flag: due ? { flagStatus: "flagged", dueDateTime: { dateTime: due + "T17:00:00", timeZone: "Europe/London" } } : { flagStatus: "flagged" }
  };
  if (cat === "resolved") return {
    categories: ["Resolved"],
    flag: { flagStatus: "complete" }
  };
  return { categories: ["Archive candidate"] };
}

export async function POST(req: Request) {
  try {
    const { run_id, limit = 10, inbox_user_id } = await req.json();
    const token = await getAccessTokenForUser(inbox_user_id);

    const { data: rows, error } = await supabaseAdmin
      .from("ai_triage_actions")
      .select("*")
      .eq("run_id", run_id)
      .eq("applied", false)
      .limit(limit);
    if (error) throw error;

    let ok = 0, fail = 0;
    for (const r of rows) {
      try {
        // 1) Patch categories/flag
        await patchMessage(token, r.message_id, patchForCategory(r.category, r.due_date));

        // 2) Create reply draft text (keep simple for now)
        let polite = `Replying to your email regarding "${r.reason}".\n\nThank you for your message. We'll review and update you shortly.\n\nKind regards`;
        
        // Check if this is a document request - use the reason field which contains the email preview
        const wantDoc = detectDocRequest(r.reason || "");
        if (wantDoc) {
          // For now, we'll just add a note about the document request
          // In a full implementation, you'd resolve the building context and get the actual document
          polite += `\n\nNote: This appears to be a request for a ${wantDoc.doc_type.replace(/_/g, " ")}. Please check if we have the latest version available.`;
        }
        
        const draft = await createReplyDraft(token, r.message_id, polite);

        await supabaseAdmin.from("ai_triage_actions")
          .update({ applied: true, draft_id: draft.id, draft_weblink: draft.webLink })
          .eq("id", r.id);

        ok++;
      } catch (e: any) {
        fail++;
        console.error(`Failed to apply triage for message ${r.message_id}:`, e);
        await supabaseAdmin.from("ai_triage_actions").update({ error: e?.message || "apply failed" }).eq("id", r.id);
      }
    }

    await supabaseAdmin.from("ai_triage_runs")
      .update({ status: fail ? "applying" : "complete" })
      .eq("id", run_id);

    return NextResponse.json({ applied: ok, failed: fail });
  } catch (e: any) {
    console.error("Triage apply error:", e);
    return NextResponse.json({ error: e.message || "Failed to apply triage" }, { status: 500 });
  }
}
