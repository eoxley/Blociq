import { NextResponse } from "next/server";
import { extractEvent } from "@/lib/extract/event";
import { buildICS, createTentativeEvent, getAccessTokenForUser } from "@/lib/outlook/events";

export async function POST(req: Request) {
  try {
    const { source = "chat", email, context, inbox_user_id } = await req.json();
    // email: { subject, body, from }
    // context: { building?: { address?: string }, defaultDurationMins?: number }

    const address = context?.building?.address || "";
    const ev = extractEvent(`${email?.subject || ""}\n${email?.body || ""}`, { address, defaultDurationMins: context?.defaultDurationMins });

    if (!ev.startISO || !ev.endISO) {
      return NextResponse.json({ mode: "none", message: "No date/time confidently detected." });
    }

    const subject = `${ev.title} — ${address || "BlocIQ"}`;
    const bodyText = ev.notes;

    // Inbox/Outlook path
    if (source === "inbox" || source === "outlook") {
      try {
        const token = await getAccessTokenForUser(inbox_user_id);
        const draft = await createTentativeEvent(token, {
          subject, bodyText, startISO: ev.startISO!, endISO: ev.endISO!, location: ev.location
        });
        return NextResponse.json({ mode: "outlook_event", draft, subject, startISO: ev.startISO, endISO: ev.endISO });
      } catch (e: any) {
        // Fallback to ICS
        const ics = buildICS({ subject, bodyText, startISO: ev.startISO!, endISO: ev.endISO!, location: ev.location });
        return NextResponse.json({ mode: "ics", ics, subject, startISO: ev.startISO, endISO: ev.endISO, warning: e?.message || "Graph error" });
      }
    }

    // Chat path → ICS
    const ics = buildICS({ subject, bodyText, startISO: ev.startISO!, endISO: ev.endISO!, location: ev.location });
    return NextResponse.json({ mode: "ics", ics, subject, startISO: ev.startISO, endISO: ev.endISO });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to prepare calendar event" }, { status: 500 });
  }
}
