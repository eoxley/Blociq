// lib/compliance/normalise.ts
// Normalise + canonicalise helpers for compliance assets.

export function normaliseText(t?: string) {
  return (t ?? "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/&/g, " and ")
    .replace(/[\/(){}\[\].,;:+*!"'`´'""|\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CAT_ALIASES: Record<string, string> = {
  "lifts": "lifts & access",
  "lift": "lifts & access",
  "water": "water hygiene",
  "gas safety": "gas & hvac",
  "asbestos survey": "asbestos"
};

const TITLE_ALIASES: Record<string, string> = {
  "fra": "fire risk assessment (fra)",
  "fire risk assessment": "fire risk assessment (fra)",
  "eicr": "electrical installation condition report (eicr)",
  "electrical installation condition report": "electrical installation condition report (eicr)",
  "emergency lighting - monthly function test": "emergency lighting – monthly functional test",
  "emergency lighting - monthly functional test": "emergency lighting – monthly functional test",
  "emergency lighting - annual 3-hour test": "emergency lighting – annual duration test (3-hour)",
  "emergency lighting - annual duration test (3-hour)": "emergency lighting – annual duration test (3-hour)",
  "lift autodial": "lift autodialler – functional test (en 81-28)",
  "powered doors/gates - safety service": "powered doors/gates – safety inspection (dhf ts 011/puwer)",
  "powered doors/gates - safety inspection (puwer)": "powered doors/gates – safety inspection (dhf ts 011/puwer)",
  "building insurance certificate": "buildings insurance – policy & certificate (annual)",
  "buildings insurance policy - annual": "buildings insurance – policy & certificate (annual)",
  "legionella risk assessment": "legionella risk assessment (lra)",
  "asbestos re inspection": "asbestos re-inspection",
  "wet riser - inspection/service": "wet riser – annual service / flow test"
};

export function canonicaliseCategory(category: string) {
  const n = normaliseText(category);
  const canon = CAT_ALIASES[n];
  return canon ? canon.replace(/\b\w/g, m => m.toUpperCase()) : category;
}

export function canonicaliseTitle(title: string) {
  const n = normaliseText(title);
  let can = TITLE_ALIASES[n] ?? title;
  can = can.replace(/\bEicr\b/, "EICR").replace(/\bFra\b/, "FRA").replace(" en 81-28", " EN 81-28");
  return can;
}

export function deriveFrequencyLabel(months?: number | null, label?: string | null) {
  if (label && label.trim()) return label;
  if (months == null) return null;
  const map: Record<number, string> = {
    1: "Monthly",
    3: "Quarterly",
    6: "6-Monthly",
    12: "Annual",
    24: "2-Yearly",
    36: "3-Yearly",
    60: "5-Yearly",
    120: "10-Yearly"
  };
  return map[months] ?? null;
}

export function normalisedPair(category: string, title: string) {
  return {
    normCategory: normaliseText(canonicaliseCategory(category)),
    normTitle: normaliseText(canonicaliseTitle(title))
  };
}
