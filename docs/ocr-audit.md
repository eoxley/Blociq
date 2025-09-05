# OCR/Extraction/Summary Pipeline Audit - BlocIQ

## Overview

BlocIQ implements a comprehensive document processing pipeline that handles upload → OCR → parsing/extraction → summarisation → persistence → UI reporting. The system currently uses multiple OCR providers with intelligent fallbacks, structured data extraction, and AI-powered summarization.

**Current Pipeline Flow:**
- **Upload**: Multiple endpoints accept files via FormData or URLs
- **OCR**: Google Vision API (primary), OpenAI Vision, PDF.js text extraction, Tesseract.js (fallback)
- **Extraction**: Regex-based parsing, AI-enhanced field extraction, lease-specific parsing
- **Summarization**: OpenAI GPT-4 for document summaries and compliance analysis
- **Persistence**: Supabase PostgreSQL with structured schemas
- **UI**: React components with document viewers and analysis results

[Flow Diagram](./ocr-audit-diagram.md)

## Key Modules & Routes

| File Path | Responsibility | Main Functions |
|-----------|----------------|----------------|
| `app/api/extract/route.ts` | Primary extraction endpoint | OpenAI Vision extraction with asset-specific prompts |
| `app/api/ocr-document-ai/route.ts` | Google Document AI integration | `processDocumentWithGoogleAI()`, `extractLeaseFields()` |
| `app/api/setup-document-ai/route.ts` | Document AI processor setup | Alternative auth methods, processor creation |
| `app/api/convert-pdf/route.ts` | PDF conversion services | DOCX to PDF conversion via CloudConvert |
| `app/api/test-ocr-comparison/route.ts` | OCR method comparison | Tests 4 different OCR approaches |
| `lib/extract-text.ts` | Core OCR orchestration | `extractText()`, `extractWithGoogleVision()`, `extractWithOpenAI()` |
| `lib/compliance/docExtract.ts` | Document text extraction | `extractTextFromBuffer()`, mammoth for DOCX |
| `lib/simple-ocr.ts` | OCR proxy wrapper | `processFileWithOCR()` via CORS proxy |
| `lib/lease-document-parser.ts` | Lease-specific parsing | `LeaseDocumentParser` class with structured analysis |
| `lib/extractSummary.ts` | Summary API client | `extractSummary()` utility function |

## Data Model Touchpoints

### Primary Tables & Columns:
- **`building_documents`**: `id`, `building_id`, `unit_id`, `leaseholder_id`, `file_name`, `file_path`, `type`, `meta` (JSON), `agency_id`
- **`leases`**: `id`, `building_id`, `unit_id`, `doc_type`, `doc_url`, `term_start`, `term_end`, `term_years`, `ground_rent_terms`, `agency_id`
- **`unit_apportionments`**: `id`, `unit_id`, `service_charge_percent`, `apportionment_type`, `agency_id`
- **`compliance_assets`**: Full compliance tracking with inspection dates, certificates, and status
- **`compliance_inspections`**: Detailed inspection records with findings and follow-up actions

### Agency Isolation:
✅ All major tables include `agency_id` for multi-tenant data isolation

## Edge Cases & Risks

### Current Risks:
- **RISK**: Large PDF processing may timeout (60s limit per OCR method)
- **RISK**: Google Vision credentials corruption in Vercel environment variables
- **RISK**: OpenAI token limits for very long documents (4000 token max)
- **RISK**: No file size validation on some endpoints
- **RISK**: PDF.js worker path dependency (`/pdf.worker.min.js`)

### Edge Cases Handled:
- ✅ Multiple OCR fallbacks when primary methods fail
- ✅ Alternative Google auth methods (API key, access token, service account)
- ✅ Robust credential parsing for corrupted JSON
- ✅ Asset-specific extraction prompts for different document types
- ✅ Timeout protection (60s per OCR method)
- ✅ File type detection and appropriate OCR method selection

## DocAI Insertion Points

### Option 1: Replace Google Vision (Recommended)
**File**: `lib/extract-text.ts:71`
**Function**: `extractWithGoogleVision()`
- Replace Google Vision API calls with Document AI processor calls
- Maintain same interface and error handling
- Use existing alternative authentication methods

### Option 2: New Primary Method
**File**: `lib/extract-text.ts:435`
**Function**: `extractText()` method chain
- Add Document AI as first priority method before PDF.js
- Insert in fallback chain: `DocAI → PDF.js → OpenAI Vision → Google Vision → Tesseract`

### Option 3: Dedicated Endpoint Enhancement
**File**: `app/api/ocr-document-ai/route.ts:4`
**Function**: `processDocumentWithGoogleAI()`
- Already configured for Document AI integration
- Just needs processor ID configuration
- Can be used as specialized lease document processor

## Zero-Risk Deployment Plan

1. **Environment Flag**: Add `USE_DOCUMENT_AI=true` environment variable
2. **Conditional Logic**: Wrap Document AI calls in feature flag checks
3. **Gradual Rollout**: Start with test endpoints, then migrate primary endpoints
4. **Fallback Preservation**: Keep existing OCR methods as fallback options
5. **Monitoring**: Use existing error logging and `test-ocr-comparison` for validation

The current architecture supports seamless Document AI integration without breaking existing functionality. The multiple fallback layers ensure system reliability during the transition.

## Environment Variables Required

### Current OCR Variables:
- `OPENAI_API_KEY` - Primary for document analysis and vision OCR
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` - Service account credentials 
- `GOOGLE_CLOUD_PROJECT_ID` - Google Cloud project ID
- `GOOGLE_VISION_API_KEY` - Alternative Vision API authentication
- `GOOGLE_CLOUD_API_KEY` - General Google Cloud API key
- `DOCUMENT_AI_LOCATION` - Document AI processor region (currently "us")

### New Variables Needed for DocAI:
- `DOCUMENT_AI_PROCESSOR_ID` - The specific processor ID for lease documents
- `USE_DOCUMENT_AI` - Feature flag (optional, defaults to false)

### Database & Storage:
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` - Database access
- Supabase handles file storage via the 'generated' bucket