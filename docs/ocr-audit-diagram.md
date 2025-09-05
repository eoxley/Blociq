# BlocIQ Document Processing Flow Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   File Upload   │    │  Storage/Buffer  │    │    OCR Engine       │
│                 │    │                  │    │   (Multi-fallback)  │
│ • FormData API  │───▶│ • File to Buffer │───▶│                     │
│ • URL-based     │    │ • Type Detection │    │ 1. PDF.js (text)    │
│ • Drag & Drop   │    │ • Size Check     │    │ 2. OpenAI Vision    │
│                 │    │                  │    │ 3. Google Vision    │
└─────────────────┘    └──────────────────┘    │ 4. Document AI ⭐   │
                                               │ 5. Tesseract.js     │
                                               └─────────────────────┘
                                                         │
                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            EXTRACTION & PARSING                                │
│                                                                                 │
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────────────────┐    │
│  │  Raw OCR Text   │    │   Field Parser   │    │   AI Enhancement       │    │
│  │                 │───▶│                  │───▶│                        │    │
│  │ • Full document │    │ • Regex patterns │    │ • Asset-specific       │    │
│  │ • Confidence    │    │ • Date extraction│    │   prompts              │    │
│  │ • Source info   │    │ • Lease parser   │    │ • GPT-4 analysis       │    │
│  │                 │    │ • Compliance     │    │ • Summary generation   │    │
│  └─────────────────┘    └──────────────────┘    └────────────────────────┘    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PERSISTENCE LAYER                                 │
│                                                                                 │
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────────────────┐    │
│  │building_documents│    │      leases      │    │  unit_apportionments   │    │
│  │                 │    │                  │    │                        │    │
│  │ • file_path     │    │ • term_start     │    │ • service_charge_%     │    │
│  │ • meta (JSON)   │    │ • term_end       │    │ • apportionment_type   │    │
│  │ • agency_id     │    │ • ground_rent    │    │ • agency_id            │    │
│  │ • building_id   │    │ • agency_id      │    │ • unit_id              │    │
│  └─────────────────┘    └──────────────────┘    └────────────────────────┘    │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    compliance_assets                                    │  │
│  │ • asset_name • inspection_frequency • last_inspection_date             │  │
│  │ • asset_type • status              • next_due_date                     │  │
│  │ • category   • certificate_url     • agency_id                         │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            SUMMARIZATION ENGINE                                │
│                                                                                 │
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────────────────┐    │
│  │   OpenAI API    │    │  Asset-Specific  │    │   Structured Output    │    │
│  │                 │    │     Prompts      │    │                        │    │
│  │ • GPT-4 Vision  │───▶│                  │───▶│ • Title extraction     │    │
│  │ • Lease context │    │ • Fire Risk      │    │ • Date extraction      │    │
│  │ • High detail   │    │ • Gas Safety     │    │ • Key risks summary    │    │
│  │                 │    │ • Electrical     │    │ • Compliance status    │    │
│  └─────────────────┘    └──────────────────┘    └────────────────────────┘    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               UI REPORTING                                      │
│                                                                                 │
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────────────────┐    │
│  │ Document Upload │    │  Analysis View   │    │   Compliance Dash      │    │
│  │                 │    │                  │    │                        │    │
│  │ • File dropzone │    │ • OCR results    │    │ • Asset status         │    │
│  │ • Progress      │    │ • Parsed fields  │    │ • Due dates            │    │
│  │ • Error display │    │ • AI summaries   │    │ • Certificate links    │    │
│  │                 │    │ • Confidence     │    │ • Renewal tracking     │    │
│  └─────────────────┘    └──────────────────┘    └────────────────────────┘    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Key Integration Points

### API Endpoints:
- `POST /api/extract` - Main extraction endpoint (OpenAI Vision)
- `POST /api/ocr-document-ai` - Document AI processor endpoint  
- `POST /api/test-ocr-comparison` - Multi-method OCR testing
- `POST /api/convert-pdf` - PDF conversion services

### Core Libraries:
- `lib/extract-text.ts:extractText()` - OCR orchestration
- `lib/lease-document-parser.ts:LeaseDocumentParser` - Structured parsing
- `lib/compliance/docExtract.ts:extractTextFromBuffer()` - Text extraction
- `lib/ocr/document-ai-config.ts` - Google Document AI configuration

### Document AI Integration Points:
⭐ **Primary**: Replace Google Vision in `lib/extract-text.ts:extractWithGoogleVision()`
⭐ **Secondary**: Enhance existing `app/api/ocr-document-ai/route.ts` endpoint
⭐ **Tertiary**: Add as priority method in `lib/extract-text.ts:extractText()` chain

### Error Handling & Fallbacks:
- Multiple OCR providers ensure reliability
- Timeout protection (60s per method)
- Alternative authentication strategies
- Robust credential parsing for environment variables