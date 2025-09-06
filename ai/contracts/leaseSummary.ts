import { z } from 'zod';

// Base source reference schema
const SourceSchema = z.object({
  page: z.number().positive(),
  span: z.object({
    start: z.number().nonnegative(),
    end: z.number().positive()
  }).optional()
});

// Party role enum
const PartyRoleSchema = z.enum([
  'landlord',
  'leaseholder', 
  'managing_agent',
  'freeholder',
  'rta',
  'other'
]);

// Party schema
const PartySchema = z.object({
  role: PartyRoleSchema,
  name: z.string().min(1),
  source: SourceSchema
});

// Identifiers schema
const IdentifiersSchema = z.object({
  address: z.string().min(1),
  unit: z.string().min(1),
  title_number: z.string().optional(),
  tenure: z.string().optional(),
  source: SourceSchema
});

// Term break schema
const TermBreakSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['mutual', 'landlord', 'leaseholder']),
  source: SourceSchema
});

// Term schema
const TermSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  length: z.enum(['years', 'months']),
  breaks: z.array(TermBreakSchema).optional(),
  source: SourceSchema.optional()
});

// Premises schema
const PremisesSchema = z.object({
  demised_parts: z.array(z.string()).min(1),
  common_rights: z.array(z.string()).optional(),
  plans: z.array(z.object({ page: z.number().positive() })).optional(),
  source: SourceSchema
});

// Financial review basis enum
const ReviewBasisSchema = z.enum([
  'RPI',
  'fixed', 
  'doubling',
  'peppercorn',
  'unknown'
]);

// Ground rent schema
const GroundRentSchema = z.object({
  amount: z.string().regex(/^£[\d,]+(\.\d{2})?$/),
  review_basis: ReviewBasisSchema,
  frequency: z.enum(['annual', 'quarterly']),
  source: SourceSchema
});

// Service charge schema
const ServiceChargeSchema = z.object({
  apportionment: z.string().min(1),
  cap: z.union([z.string().regex(/^£[\d,]+(\.\d{2})?$/), z.literal('none')]),
  frequency: z.enum(['quarterly', 'biannual', 'annual']),
  mechanism: z.enum(['on-account', 'balancing']),
  source: SourceSchema
});

// Financials schema
const FinancialsSchema = z.object({
  ground_rent: GroundRentSchema.optional(),
  service_charge: ServiceChargeSchema
});

// Repair responsibility enum
const RepairResponsibilitySchema = z.enum([
  'leaseholder',
  'landlord', 
  'both',
  'ambiguous'
]);

// Repair matrix item schema
const RepairMatrixItemSchema = z.object({
  item: z.string().min(1),
  responsible: RepairResponsibilitySchema,
  notes: z.string().optional(),
  source: SourceSchema
});

// Insurance schema
const InsuranceSchema = z.object({
  who_pays: z.enum(['leaseholder', 'landlord', 'shared']),
  scope: z.enum(['building', 'contents']),
  excess_rules: z.string().optional(),
  source: SourceSchema
});

// Use restriction rule enum
const UseRestrictionRuleSchema = z.enum([
  'permitted',
  'prohibited', 
  'consent_required'
]);

// Use restriction topic enum
const UseRestrictionTopicSchema = z.enum([
  'pets',
  'business',
  'subletting',
  'short_lets',
  'alterations',
  'flooring'
]);

// Use restriction schema
const UseRestrictionSchema = z.object({
  topic: UseRestrictionTopicSchema,
  rule: UseRestrictionRuleSchema,
  conditions: z.string().optional(),
  source: SourceSchema
});

// Consents and notices schema
const ConsentsNoticesSchema = z.object({
  landlord_consent_required: z.array(z.string()),
  notice_addresses: z.array(z.object({
    name: z.string().min(1),
    address: z.string().min(1)
  })),
  forfeiture_clause: z.enum(['present', 'not_found']),
  section_146_preconditions: z.string().optional(),
  source: SourceSchema
});

// Section 20 schema
const Section20Schema = z.object({
  consultation_required: z.enum(['yes', 'no', 'unknown']),
  method_reference: z.string().optional(),
  source: SourceSchema
});

// Variation schema
const VariationSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().min(1),
  affected_clauses: z.array(z.string()),
  source: SourceSchema
});

// Clause index item schema
const ClauseIndexItemSchema = z.object({
  id: z.string().min(1),
  heading: z.string().min(1),
  normalized_topic: z.string().min(1),
  text_excerpt: z.string().min(1),
  pages: z.array(z.number().positive())
});

// Action priority enum
const ActionPrioritySchema = z.enum(['high', 'medium', 'low']);

// Action schema
const ActionSchema = z.object({
  priority: ActionPrioritySchema,
  summary: z.string().min(1),
  reason: z.string().optional(),
  source: SourceSchema
});

// Unknown field schema
const UnknownFieldSchema = z.object({
  field_path: z.string().min(1),
  note: z.string().min(1)
});

// Document type enum
const DocumentTypeSchema = z.enum([
  'lease',
  'scope', 
  'assessment',
  'report'
]);

// Main lease summary schema
export const LeaseSummarySchema = z.object({
  contract_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  doc_type: DocumentTypeSchema,
  normalised_building_name: z.string().min(1),
  parties: z.array(PartySchema).min(1),
  identifiers: IdentifiersSchema,
  term: TermSchema,
  premises: PremisesSchema,
  financials: FinancialsSchema,
  repair_matrix: z.array(RepairMatrixItemSchema).optional(),
  insurance: InsuranceSchema.optional(),
  use_restrictions: z.array(UseRestrictionSchema).optional(),
  consents_notices: ConsentsNoticesSchema.optional(),
  section20: Section20Schema.optional(),
  variations: z.array(VariationSchema).optional(),
  clause_index: z.array(ClauseIndexItemSchema).optional(),
  actions: z.array(ActionSchema).optional(),
  unknowns: z.array(UnknownFieldSchema).optional(),
  sources: z.array(SourceSchema).optional()
});

// Scope of works specific schemas
const WorkPackageSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  value: z.string().regex(/^£[\d,]+(\.\d{2})?$/),
  source: SourceSchema
});

const ExclusionSchema = z.object({
  item: z.string().min(1),
  reason: z.string().min(1),
  source: SourceSchema
});

const PaymentStageSchema = z.object({
  stage: z.string().min(1),
  percentage: z.string().regex(/^\d+%$/),
  amount: z.string().regex(/^£[\d,]+(\.\d{2})?$/),
  source: SourceSchema
});

const ProgrammePhaseSchema = z.object({
  phase: z.string().min(1),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const ProgrammeDatesSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phases: z.array(ProgrammePhaseSchema).optional(),
  source: SourceSchema
});

const SiteConstraintSchema = z.object({
  constraint: z.string().min(1),
  reason: z.string().min(1),
  source: SourceSchema
});

const CDMPrincipalDesignerSchema = z.object({
  name: z.string().min(1),
  contact: z.string().email(),
  source: SourceSchema
});

// Scope of works schema
export const ScopeSummarySchema = z.object({
  contract_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  doc_type: z.literal('scope'),
  normalised_building_name: z.string().min(1),
  work_packages: z.array(WorkPackageSchema).min(1),
  exclusions: z.array(ExclusionSchema).optional(),
  warranty_terms: z.object({
    period: z.string().min(1),
    scope: z.string().min(1),
    source: SourceSchema
  }).optional(),
  payment_schedule: z.array(PaymentStageSchema).optional(),
  programme_dates: ProgrammeDatesSchema.optional(),
  site_constraints: z.array(SiteConstraintSchema).optional(),
  cdm_principal_designer: CDMPrincipalDesignerSchema.optional(),
  sources: z.array(SourceSchema).optional()
});

// Assessment specific schemas
const AssessmentTypeSchema = z.enum([
  'FRA',
  'EICR', 
  'Asbestos',
  'Water Risk',
  'EPC',
  'Other'
]);

const FindingSeveritySchema = z.enum([
  'high',
  'medium',
  'low',
  'info'
]);

const FindingPrioritySchema = z.enum([
  'urgent',
  'high', 
  'medium',
  'low'
]);

const FindingSchema = z.object({
  severity: FindingSeveritySchema,
  location: z.string().min(1),
  description: z.string().min(1),
  recommendation: z.string().min(1),
  priority: FindingPrioritySchema,
  source: SourceSchema
});

const AssessorSchema = z.object({
  name: z.string().min(1),
  qualification: z.string().min(1),
  source: SourceSchema
});

// Assessment/Report schema
export const AssessmentSummarySchema = z.object({
  contract_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  doc_type: z.enum(['assessment', 'report']),
  assessment_type: AssessmentTypeSchema,
  normalised_building_name: z.string().min(1),
  findings: z.array(FindingSchema).min(1),
  next_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reg_reference: z.string().optional(),
  assessor: AssessorSchema.optional(),
  sources: z.array(SourceSchema).optional()
});

// Union schema for all document types
export const DocumentSummarySchema = z.union([
  LeaseSummarySchema,
  ScopeSummarySchema,
  AssessmentSummarySchema
]);

// Type exports
export type LeaseSummary = z.infer<typeof LeaseSummarySchema>;
export type ScopeSummary = z.infer<typeof ScopeSummarySchema>;
export type AssessmentSummary = z.infer<typeof AssessmentSummarySchema>;
export type DocumentSummary = z.infer<typeof DocumentSummarySchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Party = z.infer<typeof PartySchema>;
export type ClauseIndexItem = z.infer<typeof ClauseIndexItemSchema>;
