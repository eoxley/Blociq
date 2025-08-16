// lib/docs/docTypes.ts
export type CanonicalDocType =
  | "insurance_policy"
  | "ews1"
  | "fire_risk_assessment"
  | "legionella_risk_assessment"
  | "eicr"
  | "minutes"
  | "scope_of_works"
  | "contract"
  | "invoice"
  | "quote"
  | "lift_report"
  | "policy_schedule"
  | "insurance_certificate";

const MAP: Record<CanonicalDocType, string[]> = {
  insurance_policy: [
    "insurance policy","buildings insurance","policy document","policy pack","renewal policy"
  ],
  policy_schedule: [
    "policy schedule","schedule of insurance","schedule"
  ],
  insurance_certificate: [
    "certificate of insurance","certificate of currency","coc","insurance certificate"
  ],
  ews1: ["ews1","external wall survey form","tri fire"],
  fire_risk_assessment: ["fire risk assessment","fra"],
  legionella_risk_assessment: ["legionella","legionella risk assessment","lra"],
  eicr: ["eicr","electrical installation condition report"],
  minutes: ["minutes","agm minutes","directors minutes","board minutes"],
  scope_of_works: ["scope","scope of works","specification"],
  contract: ["contract","service contract","maintenance contract"],
  invoice: ["invoice","bill"],
  quote: ["quote","quotation","estimate"],
  lift_report: ["lift report","loler","lift service report"]
};

// Returns canonical type and a confidence score
export function detectDocType(text: string): { doc_type: CanonicalDocType | null; confidence: number } {
  const t = (text || "").toLowerCase();
  let best: { key: CanonicalDocType | null; score: number } = { key: null, score: 0 };
  for (const [key, terms] of Object.entries(MAP) as Array<[CanonicalDocType, string[]]>) {
    const score = terms.reduce((acc, term) => acc + (t.includes(term) ? 1 : 0), 0);
    if (score > best.score) best = { key, score };
  }
  const confidence = Math.min(1, best.score / 2);
  return { doc_type: best.key, confidence };
}
