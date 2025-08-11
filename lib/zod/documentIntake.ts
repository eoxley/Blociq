import { z } from 'zod';

// Helper schemas
const PersonSchema = z.object({
  role: z.string(),
  name: z.string().nullable()
});

const EquipmentSchema = z.object({
  type: z.string(),
  size: z.string().nullable(),
  count: z.number(),
  locations: z.string().nullable().optional(),
  status: z.string().nullable().optional()
});

const ReminderSchema = z.object({
  label: z.string(),
  date: z.string(), // ISO date
  reason: z.string()
});

const DuplicateMatchHintSchema = z.object({
  title: z.string(),
  date: z.string()
}).nullable();

// Main document intake schema
export const DocumentIntakeSchema = z.object({
  classification: z.enum([
    "fire_certificate",
    "extinguisher_service_certificate", 
    "hose_reel_service",
    "alarm_service",
    "emergency_lighting",
    "lift_inspection",
    "gas_safety",
    "electrical_cert",
    "insurance_policy",
    "minutes",
    "budget",
    "invoice",
    "quote",
    "scope_of_works",
    "lease",
    "deed_of_variation",
    "ews1",
    "contract",
    "correspondence",
    "other"
  ]),
  document_title: z.string(),
  issuing_company_name: z.string(),
  issuing_company_contact: z.string(),
  inspection_or_issue_date: z.string().nullable(), // ISO date or null
  period_covered_end_date: z.string().nullable(), // ISO date or null
  building_name: z.string().nullable(),
  building_address: z.string().nullable(),
  building_postcode: z.string().nullable(),
  people: z.array(PersonSchema),
  standard_or_code_refs: z.array(z.string()),
  equipment: z.array(EquipmentSchema),
  notes: z.string(),
  page_count: z.number(),
  source_confidence: z.number().min(0).max(1),
  text_extracted: z.string(),
  suggested_category: z.string(),
  suggested_table: z.string(),
  suggested_compliance_asset_key: z.string().nullable(),
  next_due_date: z.string().nullable(), // ISO date or null
  reminders: z.array(ReminderSchema),
  follow_ups: z.array(z.string()),
  blocking_issues: z.array(z.string()),
  ocr_needed: z.boolean(),
  duplicates_possible: z.boolean(),
  duplicate_match_hint: DuplicateMatchHintSchema
});

export type DocumentIntakeResult = z.infer<typeof DocumentIntakeSchema>;

// Helper function to create default document intake result for failed OCR
export function createDefaultDocumentIntake(fileName: string): DocumentIntakeResult {
  return {
    classification: "other",
    document_title: fileName,
    issuing_company_name: "",
    issuing_company_contact: "",
    inspection_or_issue_date: null,
    period_covered_end_date: null,
    building_name: null,
    building_address: null,
    building_postcode: null,
    people: [],
    standard_or_code_refs: [],
    equipment: [],
    notes: "Document could not be processed due to OCR failure",
    page_count: 0,
    source_confidence: 0.0,
    text_extracted: "No text could be extracted from this document",
    suggested_category: "Unclassified",
    suggested_table: "building_documents",
    suggested_compliance_asset_key: null,
    next_due_date: null,
    reminders: [],
    follow_ups: ["Re-upload document with better quality scan", "Contact sender for digital copy"],
    blocking_issues: ["No readable text extracted", "OCR processing failed"],
    ocr_needed: true,
    duplicates_possible: false,
    duplicate_match_hint: null
  };
}
