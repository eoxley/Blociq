// lib/extract/worksOrder.ts
export type WorksOrderExtract = {
  trade_hint: string | null;
  property_address: string;
  access_details: string;
  summary: string;
};

const TRADE_KEYWORDS: Record<string, string[]> = {
  electrician: ["light", "lighting", "emergency light", "eml", "fuse", "breaker", "rcd", "socket"],
  lift: ["lift", "elevator", "stuck", "cab", "landing button"],
  plumber: ["leak", "water ingress", "drip", "pipe", "overflow", "toilet", "urinal", "cistern"],
  drainage: ["gully", "drain", "manhole", "sewer", "blocked"],
  roofer: ["roof", "gutter", "downpipe", "soffit", "fascia", "flashing"],
  fire: ["alarm", "smoke detector", "call point", "aov", "fire door", "fra"],
  door: ["entrance door", "communal door", "intercom", "fob", "access control", "closer"],
  cleaning: ["communal area", "spill", "glass", "litter", "bin store"],
  decorator: ["paint", "scuff", "decoration", "stain"],
  grounds: ["landscaping", "garden", "hedge", "lawn", "car park", "bollard"]
};

const ACCESS_KEYS = [
  "access code", "door code", "key safe", "keysafe", "concierge", "porter",
  "lift fob", "parking", "permit", "gate code", "alarm code", "site hours"
];

export function extractWorksOrder(emailText: string, ctx?: { address?: string; access?: string }): WorksOrderExtract {
  const t = (emailText || "").toLowerCase();
  let trade_hint: string | null = null;
  for (const [trade, keys] of Object.entries(TRADE_KEYWORDS)) {
    if (keys.some(k => t.includes(k))) { trade_hint = trade; break; }
  }

  // Address — prefer context; otherwise try a crude line containing common address tokens
  const addr = (ctx?.address || "") || ((emailText.match(/(\d{1,4}\s+\S.+?(?:road|street|lane|close|drive|square|gardens|court|house|mews))/i) || [])[0] || "").trim();

  // Access details — harvest lines around keywords
  const access = ctx?.access || emailText
    .split(/\r?\n/)
    .filter(line => ACCESS_KEYS.some(k => line.toLowerCase().includes(k)))
    .join("\n");

  // Short summary (first 2–3 lines)
  const summary = emailText.split(/\r?\n/).slice(0, 3).join(" ").trim();

  return { trade_hint, property_address: addr, access_details: access, summary };
}
