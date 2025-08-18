import { z } from "zod";

export const ComplianceDocExtraction = z.object({
  doc_type: z.string().min(2),           // e.g. "FRA", "EICR", "Emergency Lighting Annual", "Dry Riser Annual", "Legionella Risk Assessment"
  asset_title: z.string().min(2),        // canonical asset name to match
  summary_markdown: z.string().min(10),
  frequency_months: z.number().int().positive().optional(),
  last_completed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),  // ISO date
  next_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  provider: z.string().optional(),
  reference: z.string().optional(),
  confidence: z.number().min(0).max(1)
});
export type ComplianceDocExtraction = z.infer<typeof ComplianceDocExtraction>;

export const BatchExtraction = z.object({
  files: z.array(z.object({
    filename: z.string(),
    doc_type: z.string(),
    asset_title: z.string(),
    summary_markdown: z.string(),
    frequency_months: z.number().int().optional(),
    last_completed_date: z.string().optional(),
    next_due_date: z.string().optional(),
    provider: z.string().optional(),
    reference: z.string().optional(),
    confidence: z.number(),
    matched_asset_id: z.string().optional(),      // compliance_assets.id
    suggestions: z.array(z.string()).optional()
  }))
});
export type BatchExtraction = z.infer<typeof BatchExtraction>;
