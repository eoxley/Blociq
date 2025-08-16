import { NextResponse } from "next/server";
import { getLatestDoc } from "@/lib/docs/getLatest";
import { createReplyDraft, attachFileToMessage, getAccessTokenForUser } from "@/lib/outlook/replyWithAttachment";

async function fetchBase64(url: string) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  return btoa(binary);
}

export async function POST(req: Request) {
  try {
    const { building_id, doc_type, outlook_message_id, to_mode = "outlook", inbox_user_id } = await req.json();

    if (!building_id || !doc_type) {
      return NextResponse.json({ error: "building_id and doc_type required" }, { status: 400 });
    }

    const doc = await getLatestDoc(building_id, doc_type, { urlTTLSeconds: 86400 });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const polite = [
      `Please find the latest ${doc.doc_type.replace(/_/g, " ")} attached / linked below.`,
      "",
      doc.signed_url ? `Link: ${doc.signed_url}` : "",
      "",
      "Kind regards"
    ].filter(Boolean).join("\n");

    if (to_mode === "outlook" && outlook_message_id) {
      try {
        const token = await getAccessTokenForUser(inbox_user_id);
        const draft = await createReplyDraft(token, outlook_message_id, polite);

        // Small files only — otherwise rely on the signed link
        if (doc.signed_url && /\.(pdf|docx|xlsx)$/i.test(doc.file_name || "")) {
          try {
            const b64 = await fetchBase64(doc.signed_url);
            // 3.5 MB safety cap
            if (b64.length / 1.37 < 3_500_000) {
              await attachFileToMessage(token, draft.id, doc.file_name || "document.pdf", b64);
            }
          } catch { /* ignore attachment failure; link is already in the body */ }
        }

        return NextResponse.json({ mode: "outlook_draft", draft, doc });
      } catch (e: any) {
        // Fall back to text
        return NextResponse.json({ mode: "text", body: polite, doc, warning: e?.message || "Graph unavailable" });
      }
    }

    // Chat/UI mode — return text + link
    return NextResponse.json({ mode: "text", body: polite, doc });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to prepare reply" }, { status: 500 });
  }
}
