import { useState, useCallback } from "react";

export type TriageAttachment = {
  doc_id: string;
  title: string;
  kind: "lease_extract"|"management_agreement"|"insurance"|"FRA"|"EICR"|"lift_contract"|"s20_notice"|"major_works_scope"|"photo"|"report"|"other";
  url?: string;
};

export type TriageResult = {
  label: "urgent"|"follow_up"|"resolved"|"archive_candidate";
  priority: "P0"|"P1"|"P2"|"P3"|"P4";
  category: "FIRE"|"LIFT"|"LEAK"|"ELEC"|"SEC"|"COMP"|"INS"|"MW"|"FIN"|"LEGAL"|"OPS"|"WASTE"|"KEYS"|"PARK"|"GEN";
  intent: "report_fault"|"request_action"|"provide_info"|"complaint"|"finance_query"|"legal_query";
  required_actions: Array<"acknowledge"|"dispatch_contractor"|"request_info"|"create_task"|"escalate"|"schedule_meeting"|"update_records"|"issue_consent_form"|"raise_work_order">;
  routing: string[];
  sla_ack_mins: number;
  sla_target_hours?: number;
  sla_target_days?: number;
  confidence: number;
  reasons: string[];
  draft: {
    subject: string;
    greeting: string;        // e.g. "Dear Chris"
    body_markdown: string;   // full body (markdown)
    signoff: string;         // "Kind regards"
    signature_block: string; // your standard signature
  };
  extracted_entities?: {
    building?: string;
    unit?: string;
    leaseholder_name?: string;
    deadline?: string; // DD/MM/YYYY
  };
  attachments_suggestions?: TriageAttachment[];
};

type Params = {
  subject: string;
  plainText: string;
  from: string;
  to: string[];
  cc?: string[];
  date?: string;
};

export function useTriageDraft() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (p: Params) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/triage", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(p)
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "triage failed");
      const data = (await r.json()) as TriageResult;
      setResult(data);
      return data;
    } catch (e: any) {
      setError(e?.message ?? "Failed to generate draft");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  },[]);

  return { loading, result, error, generate, reset };
}
