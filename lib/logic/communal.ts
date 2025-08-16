// lib/logic/communal.ts
export type CommunalDetection = { communalLikely: boolean; tradeHint: string | null };

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

const COMMUNAL_WORDS = [
  "communal","common parts","stair","corridor","lobby","bin store","car park","carpark",
  "lift","entrance","hall","plant room","meter room","roof","external","gate","garage"
];

export function detectCommunalIssue(text: string, unitId?: string | null): CommunalDetection {
  const t = (text || "").toLowerCase();
  const communalWordHit = COMMUNAL_WORDS.some(w => t.includes(w));
  const privateHints = ["inside my flat","my kitchen","my bathroom","my bedroom","in our flat","my unit"];
  const privateHit = privateHints.some(w => t.includes(w));

  let tradeHint: string | null = null;
  for (const [trade, keys] of Object.entries(TRADE_KEYWORDS)) {
    if (keys.some(k => t.includes(k))) { tradeHint = trade; break; }
  }
  return { communalLikely: communalWordHit && !privateHit, tradeHint };
}
