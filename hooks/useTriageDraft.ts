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
  reply: {
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
      // Use the updated AI email reply API
      const r = await fetch("/api/ai-email-reply", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          emailData: p, // Send the email data directly
          draftType: "reply",
          tone: "professional"
        })
      });
      
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.error ?? "Failed to generate AI draft");
      }
      
      const data = await r.json();
      
      // Transform the AI email reply response to match the expected TriageResult format
      const transformedResult: TriageResult = {
        label: "follow_up",
        priority: "P2",
        category: "GEN",
        intent: "request_action",
        required_actions: ["acknowledge"],
        routing: [],
        sla_ack_mins: 60,
        confidence: 0.8,
        reasons: ["AI generated reply"],
        reply: {
          subject: `Re: ${p.subject}`,
          greeting: "Dear " + (p.from.split('@')[0] || "there"),
          body_markdown: data.response || "Thank you for your email. I will review and respond accordingly.",
          signoff: "Kind regards",
          signature_block: ""
        },
        attachments_suggestions: []
      };
      
      setResult(transformedResult);
      return transformedResult;
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
