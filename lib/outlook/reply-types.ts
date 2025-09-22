/**
 * TypeScript types and Zod schemas for Outlook AI Reply system
 */

import { z } from 'zod';

// Base types
export type TopicHint = 'fire' | 'leak' | 'costs' | 'eicr' | 'compliance' | 'general';

// Enrichment API types
export const EnrichRequestSchema = z.object({
  senderEmail: z.string().email(),
  buildingHint: z.string().optional(),
  topicHint: z.enum(['fire', 'leak', 'costs', 'eicr', 'compliance', 'general']).optional(),
  messageSummary: z.string().min(1),
  subject: z.string().optional(),
});

export type EnrichRequest = z.infer<typeof EnrichRequestSchema>;

export const EnrichmentFactsSchema = z.object({
  fraLast: z.string().nullable().optional(),
  fraNext: z.string().nullable().optional(),
  fireDoorInspectLast: z.string().nullable().optional(),
  alarmServiceLast: z.string().nullable().optional(),
  eicrLast: z.string().nullable().optional(),
  eicrNext: z.string().nullable().optional(),
  gasLast: z.string().nullable().optional(),
  gasNext: z.string().nullable().optional(),
  asbestosLast: z.string().nullable().optional(),
  asbestosNext: z.string().nullable().optional(),
  openLeakTicketRef: z.string().nullable().optional(),
  openWorkOrderRef: z.string().nullable().optional(),
});

export type EnrichmentFacts = z.infer<typeof EnrichmentFactsSchema>;

export const EnrichmentSchema = z.object({
  residentName: z.string().nullable(),
  unitLabel: z.string().nullable(),
  buildingName: z.string().nullable(),
  facts: EnrichmentFactsSchema,
});

export type Enrichment = z.infer<typeof EnrichmentSchema>;

export const ToneResultSchema = z.object({
  label: z.enum(['neutral', 'concerned', 'angry', 'abusive']),
  reasons: z.array(z.string()),
  confidence: z.number(),
  escalationRequired: z.boolean(),
});

export type ToneResult = z.infer<typeof ToneResultSchema>;

export const EnrichResponseSchema = z.object({
  enrichment: EnrichmentSchema,
  tone: ToneResultSchema,
  topic: z.enum(['fire', 'leak', 'costs', 'eicr', 'compliance', 'general']),
});

export type EnrichResponse = z.infer<typeof EnrichResponseSchema>;

// Draft API types
export const DraftRequestSchema = z.object({
  residentName: z.string().nullable().optional(),
  unitLabel: z.string().nullable().optional(),
  buildingName: z.string().nullable().optional(),
  facts: EnrichmentFactsSchema,
  originalMessageSummary: z.string().min(1),
  topicHint: z.enum(['fire', 'leak', 'costs', 'eicr', 'compliance', 'general']).optional(),
  tone: ToneResultSchema.optional(),
  userToneOverride: z.enum(['neutral', 'concerned', 'angry', 'abusive']).optional(),
});

export type DraftRequest = z.infer<typeof DraftRequestSchema>;

export const DraftResponseSchema = z.object({
  draft: z.string(),
  metadata: z.object({
    topic: z.enum(['fire', 'leak', 'costs', 'eicr', 'compliance', 'general']),
    empathyLevel: z.enum(['standard', 'high', 'urgent']),
    factCount: z.number(),
  }).optional(),
});

export type DraftResponse = z.infer<typeof DraftResponseSchema>;

// Email context from Office.js
export const EmailContextSchema = z.object({
  subject: z.string().optional(),
  senderEmail: z.string().email().optional(),
  senderName: z.string().optional(),
  body: z.string().optional(),
  itemId: z.string().optional(),
  itemType: z.string().optional(),
});

export type EmailContext = z.infer<typeof EmailContextSchema>;

// Combined request for AI Reply workflow
export const AIReplyRequestSchema = z.object({
  emailContext: EmailContextSchema,
  customMessage: z.string().optional(),
});

export type AIReplyRequest = z.infer<typeof AIReplyRequestSchema>;

// Database query interfaces for Supabase
export interface LeaseholderRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  unit_id: string | null;
}

export interface UnitRow {
  id: string;
  unit_number: string | null;
  building_id: string;
}

export interface BuildingRow {
  id: string;
  name: string;
  address: string | null;
}

export interface ComplianceAssetRow {
  id: string;
  building_id: string;
  asset_type: string;
  last_inspection_date: string | null;
  next_inspection_date: string | null;
  status: string | null;
  notes: string | null;
}

export interface WorkOrderRow {
  id: string;
  reference: string | null;
  building_id: string;
  unit_id: string | null;
  status: string;
  type: string | null;
  description: string | null;
  created_at: string;
}

export interface TicketRow {
  id: string;
  reference: string | null;
  building_id: string;
  unit_id: string | null;
  status: string;
  category: string | null;
  description: string | null;
  created_at: string;
}

// Error types
export const APIErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
});

export type APIError = z.infer<typeof APIErrorSchema>;