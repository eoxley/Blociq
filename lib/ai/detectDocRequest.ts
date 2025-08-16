import { detectDocType } from "@/lib/docs/docTypes";

export function detectDocRequest(text: string) {
  const t = (text || "").toLowerCase();
  const asks = /(send|share|provide|copy|can i have|may i have|please forward|please send)/i.test(t);
  const { doc_type, confidence } = detectDocType(t);
  return asks && doc_type && confidence >= 0.5 ? { doc_type, confidence } : null;
}
