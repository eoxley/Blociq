// lib/extract/event.ts
import * as chrono from "chrono-node";

export type EventExtract = {
  kind: "agm" | "directors" | "contractor" | "assessment" | "meeting";
  title: string;
  startISO: string | null;
  endISO: string | null;
  location: string;
  notes: string;
};

const KIND_MAP: Array<{kind: EventExtract["kind"]; terms: string[]; title: string}> = [
  { kind: "agm", terms: ["agm", "annual general meeting"], title: "AGM" },
  { kind: "directors", terms: ["directors meeting", "board meeting", "rte meeting"], title: "Directors' Meeting" },
  { kind: "contractor", terms: ["contractor", "attendance", "visit", "engineer"], title: "Contractor Attendance" },
  { kind: "assessment", terms: ["assessment", "survey", "inspection", "risk assessment"], title: "Assessment" },
  { kind: "meeting", terms: ["meeting", "catch up", "teams", "call"], title: "Meeting" },
];

function detectKind(text: string): EventExtract["kind"] {
  const t = text.toLowerCase();
  for (const k of KIND_MAP) if (k.terms.some(term => t.includes(term))) return k.kind;
  return "meeting";
}
function defaultTitle(kind: EventExtract["kind"]) {
  return KIND_MAP.find(k => k.kind === kind)?.title || "Meeting";
}

export function extractEvent(text: string, ctx?: { address?: string; defaultDurationMins?: number }) : EventExtract {
  const kind = detectKind(text);
  const title = defaultTitle(kind);

  // Parse with chrono using UK bias and forwardDate
  const ref = new Date();
  const results = chrono.en.GB.parse(text, ref, { forwardDate: true });

  let start: Date | null = null;
  let end: Date | null = null;

  if (results.length) {
    const r = results[0];
    start = r.start?.date() || null;
    end = r.end?.date() || null;
  }

  // If only a date/time found, set default duration (60 mins; 120 for AGMs)
  const duration = ctx?.defaultDurationMins ?? (kind === "agm" ? 120 : 60);
  if (start && !end) end = new Date(start.getTime() + duration * 60 * 1000);

  const toISO = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,19) : null);

  return {
    kind,
    title,
    startISO: toISO(start),
    endISO: toISO(end),
    location: ctx?.address || "",
    notes: snippet(text, 900)
  };
}

function snippet(s: string, n: number) { const t = (s||"").replace(/\s+/g," ").trim(); return t.length>n ? t.slice(0,n)+" …" : t; }
