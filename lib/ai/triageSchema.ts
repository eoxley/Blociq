import { z } from "zod";

// Input schema for incoming emails
export const IncomingEmail = z.object({
  subject: z.string(),
  body: z.string(),
  from: z.string(),
  to: z.array(z.string()),
  cc: z.array(z.string()).optional(),
  date: z.string().optional(),
  plainText: z.string().optional(),
});

// Draft reply schema
export const DraftReply = z.object({
  greeting: z.string(),
  body_markdown: z.string(),
  subject: z.string(),
  signoff: z.string(),
  signature_block: z.string(),
});

// Attachment suggestion schema
export const AttachmentSuggestion = z.object({
  doc_id: z.string(), // Supabase doc id or storage path
  title: z.string(),
  kind: z.enum([
    "lease_extract",
    "management_agreement", 
    "insurance",
    "FRA",
    "EICR",
    "lift_contract",
    "s20_notice",
    "major_works_scope",
    "photo",
    "report",
    "other"
  ]),
  url: z.string().optional() // signed/public link if available
});

// Main triage output schema
export const TriageOutput = z.object({
  label: z.enum(["urgent", "follow_up", "resolved", "archive_candidate"]),
  priority: z.enum(["P0", "P1", "P2", "P3", "P4"]),
  category: z.enum(["FIRE", "LIFT", "LEAK", "ELEC", "SEC", "COMP", "INS", "MW", "FIN", "LEGAL", "OPS", "WASTE", "KEYS", "PARK", "GEN"]),
  intent: z.enum(["report_fault", "request_action", "provide_info", "complaint", "finance_query", "legal_query"]),
  required_actions: z.array(z.enum(["acknowledge", "dispatch_contractor", "request_info", "create_task", "escalate", "schedule_meeting", "update_records", "issue_consent_form", "raise_work_order"])),
  routing: z.array(z.string()),
  sla_ack_mins: z.number(),
  sla_target_hours: z.number().optional(),
  sla_target_days: z.number().optional(),
  confidence: z.number(),
  reasons: z.array(z.string()),
  reason: z.string(),
  due_date: z.string().optional(),
  reply: DraftReply.optional(),
  extracted_entities: z.object({
    building: z.string().optional(),
    unit: z.string().optional(),
    leaseholder_name: z.string().optional(),
    deadline: z.string().optional(), // DD/MM/YYYY
  }).optional(),
  attachments_suggestions: z.array(AttachmentSuggestion).optional(),
});

// Type exports
export type IncomingEmail = z.infer<typeof IncomingEmail>;
export type DraftReply = z.infer<typeof DraftReply>;
export type AttachmentSuggestion = z.infer<typeof AttachmentSuggestion>;
export type TriageOutput = z.infer<typeof TriageOutput>;
