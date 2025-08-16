export function displayUnit(unit_label?: string | null, unit_number?: string | null) {
  const label = (unit_label || "").trim();
  const number = (unit_number || "").trim();
  // Avoid "Flat Flat 1" duplication: if label already contains the number, prefer label; else join.
  if (label && (label.toLowerCase().includes(number.toLowerCase()) || !number)) return label;
  if (label && number) return `${label} ${number}`;
  return label || number || "—";
}
export function fmtPct(p?: number | null) {
  if (p === null || p === undefined) return "—";
  return `${Number(p).toFixed(3)}%`;
}
export function safe(v?: string | null) { return v?.trim() || "—"; }
