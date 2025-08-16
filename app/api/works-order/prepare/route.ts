import { NextResponse } from "next/server";
import { buildWorksOrderEmail } from "@/lib/email/templates/worksOrder";
import { createOutlookDraft, getAccessTokenForUser } from "@/lib/outlook/graph";

export async function POST(req: Request) {
  try {
    const { payload } = await req.json();
    const {
      property_address, trade_hint, request_text, access_details,
      attachments, resident, source = "chat",
      contractor, to_email,             // to_email preferred if present
      outlook_user_id,                  // optional: app-context user mailbox; delegated=use "me"
      inbox_user_id                     // your internal user id to resolve token
    } = payload || {};

    if (!property_address || !request_text) {
      return NextResponse.json({ error: "Missing property_address or request_text" }, { status: 400 });
    }

    const { subject, body } = buildWorksOrderEmail({
      property_address, trade_hint, request_text, access_details, attachments, resident, auth_cap: payload?.auth_cap
    });

    const recipient = to_email || contractor?.email || "";
    if (!recipient) {
      // No contractor yet; return text for manual selection
      return NextResponse.json({ mode: "text", subject, body, to: "" });
    }

    // Inbox / Outlook flow: create Outlook draft if possible
    if (source === "inbox" || source === "outlook") {
      try {
        const token = await getAccessTokenForUser(inbox_user_id);
        const draft = await createOutlookDraft("me", token, [{ address: recipient }], subject, body);
        return NextResponse.json({
          mode: "outlook_draft",
          to: recipient,
          subject,
          body,
          draft, // { id, webLink, internetMessageId }
          tip: "Use webLink to open the draft in Outlook Web."
        });
      } catch (e: any) {
        // Fall back to plain text if token/Graph fails
        return NextResponse.json({
          mode: "text_fallback",
          to: recipient,
          subject,
          body,
          warning: "Outlook token not available or Graph call failed – returning text for manual send.",
          error: e?.message || "Graph error"
        });
      }
    }

    // Chat flow → return Subject/Body for manual send or your in-app mailer
    return NextResponse.json({ mode: "text", subject, body, to: recipient });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to prepare works order" }, { status: 500 });
  }
}
