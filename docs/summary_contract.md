# Lease Lab → Ask BlocIQ Summary Contract

## Overview

This document defines the machine-readable contract that Lease Lab must produce and Ask BlocIQ must consume for lease analysis data. The contract ensures consistent, source-verified responses across both systems.

## Contract Version: 1.0.0

### Core Principles

- **British English** throughout
- **Facts first** - LLM used only for phrasing, not fact generation
- **Single source of truth** - structured data in `document_jobs.summary_json`
- **Source verification** - every fact carries a page reference or span ID
- **No duplication** - compute views from canonical data

## Document Types

### 1. Lease Documents (`doc_type: "lease"`)

**Required fields:**
- `parties` - All parties to the lease
- `term.start` - Lease commencement date
- `premises.demised_parts` - What's included in the demise
- `financials.service_charge.apportionment` - How service charges are calculated
- `clause_index` - Complete index of lease clauses

**Contract Shape:**
```json
{
  "contract_version": "1.0.0",
  "doc_type": "lease",
  "normalised_building_name": "Ashwood House",
  "parties": [
    {
      "role": "landlord|leaseholder|managing_agent|freeholder|rta|other",
      "name": "ABC Property Ltd",
      "source": {"page": 12}
    }
  ],
  "identifiers": {
    "address": "123 Main Street, London SW1A 1AA",
    "unit": "Flat 8",
    "title_number": "NGL123456",
    "tenure": "leasehold",
    "source": {"page": 1}
  },
  "term": {
    "start": "2020-01-01",
    "end": "2119-12-31",
    "length": "years",
    "breaks": [
      {
        "date": "2025-01-01",
        "type": "mutual|landlord|leaseholder",
        "source": {"page": 6}
      }
    ]
  },
  "premises": {
    "demised_parts": [
      "windows_in",
      "windows_out", 
      "walls_in",
      "internal_doors",
      "floor_covering"
    ],
    "common_rights": [
      "bike_store",
      "bin_store", 
      "parking_bay_8"
    ],
    "plans": [{"page": 46}],
    "source": {"page": 2}
  },
  "financials": {
    "ground_rent": {
      "amount": "£250",
      "review_basis": "RPI|fixed|doubling|peppercorn|unknown",
      "frequency": "annual",
      "source": {"page": 8}
    },
    "service_charge": {
      "apportionment": "0.5% or method",
      "cap": "£2000|none",
      "frequency": "quarterly|biannual|annual",
      "mechanism": "on-account|balancing",
      "source": {"page": 9}
    }
  },
  "repair_matrix": [
    {
      "item": "windows",
      "responsible": "leaseholder|landlord|both|ambiguous",
      "notes": "External frames landlord, internal glazing leaseholder",
      "source": {"page": 14}
    }
  ],
  "insurance": {
    "who_pays": "leaseholder|landlord|shared",
    "scope": "building|contents",
    "excess_rules": "First £500 by leaseholder",
    "source": {"page": 10}
  },
  "use_restrictions": [
    {
      "topic": "pets|business|subletting|short_lets|alterations|flooring",
      "rule": "permitted|prohibited|consent_required",
      "conditions": "Written consent required for structural alterations",
      "source": {"page": 18}
    }
  ],
  "consents_notices": {
    "landlord_consent_required": [
      "alterations",
      "assignment", 
      "underletting"
    ],
    "notice_addresses": [
      {
        "name": "ABC Property Management",
        "address": "123 Property Street, London"
      }
    ],
    "forfeiture_clause": "present|not_found",
    "section_146_preconditions": "14 days notice required",
    "source": {"page": 20}
  },
  "section20": {
    "consultation_required": "yes|no|unknown",
    "method_reference": "clause 3.4 or schedule 2",
    "source": {"page": 22}
  },
  "variations": [
    {
      "date": "2023-06-15",
      "summary": "Extended lease term by 20 years",
      "affected_clauses": ["2.1", "3.2"],
      "source": {"page": 3}
    }
  ],
  "clause_index": [
    {
      "id": "2.3",
      "heading": "Repairs and Maintenance",
      "normalized_topic": "repairs",
      "text_excerpt": "The leaseholder shall keep the demised premises in good repair...",
      "pages": [13, 14]
    }
  ],
  "actions": [
    {
      "priority": "high|medium|low",
      "summary": "Register deed of variation",
      "reason": "Lease term extended but not registered",
      "source": {"page": 3}
    }
  ],
  "unknowns": [
    {
      "field_path": "financials.ground_rent.review_basis",
      "note": "Not specified explicitly in lease"
    }
  ],
  "sources": [
    {
      "page": 14,
      "span": {"start": 120, "end": 230}
    }
  ]
}
```

### 2. Scopes of Works (`doc_type: "scope"`)

**Contract Shape:**
```json
{
  "contract_version": "1.0.0",
  "doc_type": "scope",
  "normalised_building_name": "Ashwood House",
  "work_packages": [
    {
      "name": "Window Replacement",
      "description": "Replace all windows with double glazing",
      "value": "£150,000",
      "source": {"page": 5}
    }
  ],
  "exclusions": [
    {
      "item": "Internal decoration",
      "reason": "Not included in contract",
      "source": {"page": 8}
    }
  ],
  "warranty_terms": {
    "period": "10 years",
    "scope": "Materials and workmanship",
    "source": {"page": 12}
  },
  "payment_schedule": [
    {
      "stage": "Commencement",
      "percentage": "20%",
      "amount": "£30,000",
      "source": {"page": 15}
    }
  ],
  "programme_dates": {
    "start": "2024-03-01",
    "completion": "2024-08-31",
    "phases": [
      {
        "phase": "Phase 1 - Ground Floor",
        "start": "2024-03-01",
        "end": "2024-05-15"
      }
    ],
    "source": {"page": 18}
  },
  "site_constraints": [
    {
      "constraint": "Working hours 8am-5pm weekdays only",
      "reason": "Residential building",
      "source": {"page": 20}
    }
  ],
  "cdm_principal_designer": {
    "name": "ABC Design Ltd",
    "contact": "design@abc.com",
    "source": {"page": 22}
  },
  "sources": [
    {
      "page": 5,
      "span": {"start": 50, "end": 120}
    }
  ]
}
```

### 3. Assessments/Reports (`doc_type: "assessment"` or `"report"`)

**Contract Shape:**
```json
{
  "contract_version": "1.0.0",
  "doc_type": "assessment",
  "assessment_type": "FRA|EICR|Asbestos|Water Risk|EPC|Other",
  "normalised_building_name": "Ashwood House",
  "findings": [
    {
      "severity": "high|medium|low|info",
      "location": "Ground floor electrical cupboard",
      "description": "Outdated consumer unit requires replacement",
      "recommendation": "Replace with modern RCD-protected unit",
      "priority": "urgent|high|medium|low",
      "source": {"page": 8}
    }
  ],
  "next_due_date": "2025-06-15",
  "reg_reference": "EICR-2024-001",
  "assessor": {
    "name": "John Smith",
    "qualification": "NICEIC Approved Contractor",
    "source": {"page": 1}
  },
  "sources": [
    {
      "page": 8,
      "span": {"start": 200, "end": 350}
    }
  ]
}
```

## Quality Gates

### Required for Leases
- `parties` array must not be empty
- `term.start` must be valid date
- `premises.demised_parts` must not be empty
- `financials.service_charge.apportionment` must be present
- `clause_index` must have at least one entry

### Validation Rules
- All monetary amounts must include currency symbol
- All dates must be in YYYY-MM-DD format
- All sources must include page number
- Unknown fields must be explicitly listed in `unknowns` array

### Linter Rules
- If `repair_matrix` contains "windows" but `premises.demised_parts` lacks `windows_in`/`windows_out`, flag for review
- If `section20.consultation_required` is "yes" but no method reference provided, flag for review
- If `parties` contains "managing_agent" but no notice address provided, flag for review

## Ask BlocIQ Integration

### Answer Template
```
Answer: <one or two crisp lines>
Key facts:
- Responsibility: <…> (Lease Lab, p.<n>)
- Clause: <id/heading> (Lease Lab, p.<n>)
- Apportionment/Amount: <…> (if relevant)
If unclear: "The lease does not specify this; please review clause <id>."
```

### Safe Responses for Unknowns
- "The lease does not specify this; please review clause <id>."
- "This information is not specified in the lease analysis."
- "Please refer to the original lease document for this detail."

## Copy Pack

### User-Facing Messages
- "Lease Lab analysis attached. Answers are based on verified lease clauses."
- "This item isn't specified in the lease. Please review clause <id> or the original document."
- "Analysis complete — clauses, dates and action points are available."
