# Mapping Existing Lease Logic to Summary Contract

This document maps existing lease extraction and analysis logic to the new unified summary contract fields.

## Current Lease Processing System

### Files to Review and Map

1. **`lib/HybridLeaseProcessor.ts`** - Main lease processing logic
2. **`app/api/lease-processing/upload/route.ts`** - Upload endpoint
3. **`app/api/lease-processing/results/[jobId]/route.ts`** - Results endpoint
4. **`components/LeaseAnalysisResults.tsx`** - UI components
5. **`lib/ai/leaseAnalysis.ts`** - AI analysis logic

## Field Mappings

### 1. Document Metadata
| Current Field | Contract Field | Notes |
|---------------|----------------|-------|
| `filename` | `identifiers.unit` | Extract unit from filename pattern |
| `building_name` | `normalised_building_name` | Standardize building names |
| `document_type` | `doc_type` | Map to "lease" |
| `created_at` | `sources[].page` | Use for temporal context |

### 2. Parties Information
| Current Field | Contract Field | Mapping Logic |
|---------------|----------------|---------------|
| `landlord_name` | `parties[].name` where `role="landlord"` | Extract from lease header |
| `leaseholder_name` | `parties[].name` where `role="leaseholder"` | Extract from lease header |
| `managing_agent` | `parties[].name` where `role="managing_agent"` | Extract from correspondence |
| `freeholder` | `parties[].name` where `role="freeholder"` | Extract from lease recitals |

### 3. Lease Terms
| Current Field | Contract Field | Mapping Logic |
|---------------|----------------|---------------|
| `lease_start_date` | `term.start` | Parse date format |
| `lease_end_date` | `term.end` | Parse date format |
| `lease_length` | `term.length` | Calculate in years/months |
| `break_clauses` | `term.breaks[]` | Extract break clause dates |

### 4. Premises
| Current Field | Contract Field | Mapping Logic |
|---------------|----------------|---------------|
| `demised_premises` | `premises.demised_parts[]` | Parse demise description |
| `common_parts` | `premises.common_rights[]` | Extract common area rights |
| `plans_reference` | `premises.plans[]` | Extract plan page references |

### 5. Financial Information
| Current Field | Contract Field | Mapping Logic |
|---------------|----------------|---------------|
| `ground_rent_amount` | `financials.ground_rent.amount` | Extract monetary value |
| `ground_rent_frequency` | `financials.ground_rent.frequency` | Parse frequency |
| `service_charge_apportionment` | `financials.service_charge.apportionment` | Extract calculation method |
| `service_charge_cap` | `financials.service_charge.cap` | Extract cap amount |
| `service_charge_frequency` | `financials.service_charge.frequency` | Parse frequency |

### 6. Repair Responsibilities
| Current Field | Contract Field | Mapping Logic |
|---------------|----------------|---------------|
| `repair_obligations` | `repair_matrix[]` | Parse repair clause |
| `landlord_repairs` | `repair_matrix[].responsible="landlord"` | Categorize by responsibility |
| `leaseholder_repairs` | `repair_matrix[].responsible="leaseholder"` | Categorize by responsibility |

### 7. Use Restrictions
| Current Field | Contract Field | Mapping Logic |
|---------------|----------------|---------------|
| `pet_policy` | `use_restrictions[]` where `topic="pets"` | Extract pet restrictions |
| `business_use` | `use_restrictions[]` where `topic="business"` | Extract business use rules |
| `subletting_rules` | `use_restrictions[]` where `topic="subletting"` | Extract subletting restrictions |
| `alteration_consent` | `use_restrictions[]` where `topic="alterations"` | Extract alteration rules |

### 8. Legal Provisions
| Current Field | Contract Field | Mapping Logic |
|---------------|----------------|---------------|
| `forfeiture_clause` | `consents_notices.forfeiture_clause` | Detect presence of forfeiture |
| `section_146_notice` | `consents_notices.section_146_preconditions` | Extract notice requirements |
| `landlord_consent_required` | `consents_notices.landlord_consent_required[]` | Extract consent requirements |
| `notice_addresses` | `consents_notices.notice_addresses[]` | Extract notice addresses |

### 9. Section 20 Consultation
| Current Field | Contract Field | Mapping Logic |
|---------------|----------------|---------------|
| `section_20_consultation` | `section20.consultation_required` | Detect consultation requirements |
| `section_20_method` | `section20.method_reference` | Extract consultation method |

### 10. Clause Index
| Current Field | Contract Field | Mapping Logic |
|---------------|----------------|---------------|
| `clause_headings` | `clause_index[].heading` | Extract clause headings |
| `clause_numbers` | `clause_index[].id` | Extract clause numbers |
| `clause_topics` | `clause_index[].normalized_topic` | Categorize clause topics |
| `clause_text` | `clause_index[].text_excerpt` | Extract clause text |

## Parsers to Keep and Enhance

### 1. Apportionment Calculator
- **Current**: `calculateServiceChargeApportionment()`
- **Contract**: `financials.service_charge.apportionment`
- **Enhancement**: Support percentage, floor area, and custom methods

### 2. Repair Responsibility Parser
- **Current**: `parseRepairObligations()`
- **Contract**: `repair_matrix[]`
- **Enhancement**: Better categorization of ambiguous responsibilities

### 3. Forfeiture Clause Detector
- **Current**: `detectForfeitureClause()`
- **Contract**: `consents_notices.forfeiture_clause`
- **Enhancement**: Extract specific preconditions

### 4. Consent Requirements Extractor
- **Current**: `extractConsentRequirements()`
- **Contract**: `consents_notices.landlord_consent_required[]`
- **Enhancement**: Categorize by type (alterations, assignment, etc.)

### 5. Section 20 Trigger Detector
- **Current**: `detectSection20Triggers()`
- **Contract**: `section20.consultation_required`
- **Enhancement**: Extract specific thresholds and methods

### 6. Variations Tracker
- **Current**: `trackLeaseVariations()`
- **Contract**: `variations[]`
- **Enhancement**: Link variations to affected clauses

### 7. Plans Reference Extractor
- **Current**: `extractPlansReferences()`
- **Contract**: `premises.plans[]`
- **Enhancement**: Extract plan page numbers and descriptions

## Fields to Remove/Deprecate

### UI Components to Remove
- `LeaseAnalysisResults.tsx` - Replace with contract-based display
- `LeaseProcessingStatus.tsx` - Integrate into Lease Lab
- `LeaseUploadWidget.tsx` - Replace with Lease Lab upload

### API Endpoints to Deprecate
- `/api/lease-processing/upload` - Replace with `/api/lease-lab/upload`
- `/api/lease-processing/results/[jobId]` - Replace with `/api/lease-lab/jobs/[id]`
- `/api/lease-processing/status/[jobId]` - Replace with job status in Lease Lab

### Database Fields to Remove
- `lease_analysis` table - Replace with `document_jobs.summary_json`
- `lease_processing_jobs` table - Replace with `document_jobs`
- Legacy confidence percentages - Replace with source verification

### Hybrid Processing Paths
- Inline OCR processing - Move to background processing
- Confidence scoring - Replace with source verification
- Ad-hoc response generation - Replace with contract-based responses

## Migration Strategy

### Phase 1: Contract Implementation
1. Implement Zod schemas
2. Create database view
3. Update Lease Lab to produce contract-compliant summaries

### Phase 2: Ask BlocIQ Integration
1. Create adapter for contract consumption
2. Update Ask BlocIQ to use contract data
3. Implement source verification in responses

### Phase 3: Legacy Cleanup
1. Remove deprecated UI components
2. Deprecate old API endpoints
3. Clean up database schema

### Phase 4: Enhancement
1. Add advanced clause search
2. Implement embedding-based clause matching
3. Add automated action item generation

## Quality Assurance

### Validation Rules
- All monetary amounts must include currency
- All dates must be in ISO format
- All sources must include page references
- Unknown fields must be explicitly listed

### Testing Checklist
- [ ] Contract validation passes for sample lease
- [ ] Ask BlocIQ adapter returns correct facts
- [ ] Source references are preserved
- [ ] Unknown fields are handled safely
- [ ] Performance is acceptable for large leases

## Implementation Notes

### Source Tracking
- Use page numbers for primary references
- Use span offsets for precise text locations
- Maintain source hierarchy (page > clause > span)

### Error Handling
- Validation failures should not crash the system
- Unknown fields should be preserved, not discarded
- Partial data should be usable where possible

### Performance Considerations
- Index clause_index for fast topic searches
- Use materialized views for complex aggregations
- Cache frequently accessed contract data
