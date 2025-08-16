// lib/outlook/events.ts
import { v4 as uuidv4 } from "uuid";

export async function getAccessTokenForUser(userId?: string) {
  // TODO: wire to your existing MSAL/Outlook token store and return delegated token.
  throw new Error("Outlook token lookup not implemented.");
}

export async function createTentativeEvent(token: string, ev: {
  subject: string; bodyText?: string; startISO: string; endISO: string; location?: string;
}) {
  const endpoint = "https://graph.microsoft.com/v1.0/me/events";
  const payload = {
    subject: ev.subject,
    body: { contentType: "Text", content: ev.bodyText || "" },
    start: { dateTime: ev.startISO, timeZone: "Europe/London" },
    end:   { dateTime: ev.endISO,   timeZone: "Europe/London" },
    location: { displayName: ev.location || "" },
    showAs: "tentative",
    isReminderOn: true,
    reminderMinutesBeforeStart: 60,
    sensitivity: "private"
  };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": "outlook.timezone=\"Europe/London\"",
      "Idempotency-Key": uuidv4()
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Graph create event failed ${res.status} ${await res.text().catch(()=> "")}`);
  const j = await res.json();
  return { id: j.id, webLink: j.webLink || "" };
}

export function buildICS(ev: { subject: string; startISO: string; endISO: string; location?: string; bodyText?: string }) {
  // Very small ICS — enough for import
  const uid = uuidv4();
  const dt = (iso: string) => iso.replace(/[-:]/g, "").split(".")[0] + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BlocIQ//Calendar Draft//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dt(new Date().toISOString())}`,
    `DTSTART:${dt(ev.startISO)}`,
    `DTEND:${dt(ev.endISO)}`,
    `SUMMARY:${escapeICS(ev.subject)}`,
    ev.location ? `LOCATION:${escapeICS(ev.location)}` : "",
    ev.bodyText ? `DESCRIPTION:${escapeICS(ev.bodyText)}` : "",
    "END:VEVENT",
    "END:VCALENDAR"
  ].filter(Boolean).join("\r\n");
}
function escapeICS(s: string) { return (s || "").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n"); }
