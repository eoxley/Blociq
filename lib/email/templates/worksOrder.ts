// lib/email/templates/worksOrder.ts
type Resident = { name?: string; phone?: string; email?: string } | null;

export function buildWorksOrderEmail(opts: {
  property_address: string;
  trade_hint?: string | null;
  request_text: string;
  access_details?: string;
  attachments?: Array<{ filename: string }>;
  resident?: Resident;
  auth_cap?: string; // optional authority cap line
}) {
  const subject = `${opts.property_address} — ${opts.trade_hint ? opts.trade_hint + " " : ""}works order`;
  const lines: string[] = [];

  lines.push(`Please attend as soon as feasible to diagnose and report on the issue at ${opts.property_address}.`);
  lines.push("");
  lines.push("Summary of issue (from resident/report):");
  lines.push(indent(trimTo(opts.request_text, 1200)));
  lines.push("");
  if (opts.access_details) {
    lines.push("Access & site notes:");
    lines.push(indent(opts.access_details));
    lines.push("");
  }
  if (opts.resident && (opts.resident.name || opts.resident.phone || opts.resident.email)) {
    lines.push("On-site contact (if required):");
    lines.push(indent([opts.resident.name, opts.resident.phone, opts.resident.email].filter(Boolean).join(" | ")));
    lines.push("");
  }
  if (opts.attachments?.length) {
    lines.push("Reference photos/attachments:");
    opts.attachments.forEach(a => lines.push(`• ${a.filename}`));
    lines.push("");
  }
  lines.push("Instructions:");
  lines.push(indent(opts.auth_cap || "Attend and diagnose; provide written report and quotation if remedial works are required. Do not proceed beyond diagnosis without written instruction."));
  lines.push("");
  lines.push("Please confirm ETA and any access/parts requirements.");
  lines.push("");
  lines.push("Kind regards");
  const body = lines.join("\n");

  return { subject, body };
}

function indent(s: string) { return (s || "").split("\n").map(l => `• ${l}`).join("\n"); }
function trimTo(s: string, n: number) { return (s || "").length > n ? (s || "").slice(0, n) + " …" : (s || ""); }
