# Document Intake System

BlocIQ's document intake system automatically processes uploaded documents (PDFs, images, etc.) and extracts structured information for filing and compliance tracking.

## Overview

The system provides end-to-end document processing:

1. **File Upload** - Accepts multipart form data with document files
2. **Text Extraction** - Extracts text from PDFs and images (with OCR fallback)
3. **AI Analysis** - Uses GPT-4 to classify and extract structured data
4. **Validation** - Validates results against a strict Zod schema
5. **Storage** - Saves to Supabase with automatic building matching
6. **Reminders** - Creates due date reminders for periodic documents

## API Endpoint

### POST `/api/document-intake`

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `file` (required): The document file
  - `building_hint` (optional): Building name for context
  - `building_id` (optional): Direct building ID

**Response:**
```json
{
  "ok": true,
  "data": {
    "classification": "extinguisher_service_certificate",
    "document_title": "Certificate of Inspection",
    "issuing_company_name": "Alban Fire Protection",
    "inspection_or_issue_date": "2021-09-01",
    "building_name": "50 Kensington Gardens Square",
    "next_due_date": "2022-09-01",
    "source_confidence": 0.86,
    // ... other extracted fields
  },
  "storage": { "path": "uploads/user-id/timestamp-filename.pdf" },
  "building_id": "building-uuid",
  "document_id": "document-uuid"
}
```

## Document Classifications

The system recognizes these document types:

- **Fire Safety**: `fire_certificate`, `extinguisher_service_certificate`, `hose_reel_service`, `alarm_service`, `emergency_lighting`
- **Equipment**: `lift_inspection`, `gas_safety`, `electrical_cert`
- **Financial**: `insurance_policy`, `budget`, `invoice`, `quote`
- **Legal**: `lease`, `deed_of_variation`, `ews1`, `contract`
- **Administrative**: `minutes`, `scope_of_works`, `correspondence`
- **Other**: `other`

## Extracted Fields

For each document, the system extracts:

### Core Information
- `document_title` - Document name/title
- `issuing_company_name` - Company that issued the document
- `issuing_company_contact` - Phone/email contact details
- `inspection_or_issue_date` - When document was issued (ISO date)
- `period_covered_end_date` - When coverage expires (if applicable)

### Building Information
- `building_name` - Building name from document
- `building_address` - Full address
- `building_postcode` - UK postcode

### Technical Details
- `people` - Array of people involved (engineers, signatories, etc.)
- `standard_or_code_refs` - British Standards or code references
- `equipment` - Equipment details (type, size, count, locations)
- `notes` - Defects, advisories, or important notes

### Filing Suggestions
- `suggested_category` - Human-readable category
- `suggested_table` - Database table for storage
- `suggested_compliance_asset_key` - Compliance asset reference
- `next_due_date` - When next action is due
- `reminders` - Array of reminder objects

### Quality Flags
- `source_confidence` - AI confidence score (0-1)
- `ocr_needed` - Whether OCR processing was required
- `blocking_issues` - Issues preventing full processing
- `duplicates_possible` - Whether duplicates might exist

## Text Extraction

The system handles multiple file types:

### PDFs
- Uses `pdf-parse` for text extraction
- Falls back to `pdfjs-dist` if primary method fails
- Extracts page count and text content

### Images
- Uses Tesseract.js for OCR
- Falls back to Google Cloud Vision if credentials available
- Returns OCR status and extracted text

### Other Files
- Currently returns empty text (OCR needed flag set)
- Future: Support for DOCX, RTF, etc.

## AI Processing

The AI system uses a structured prompt to:

1. **Classify** the document type
2. **Extract** relevant fields based on classification
3. **Suggest** filing location and category
4. **Identify** follow-up actions and due dates
5. **Flag** any issues or missing information

The AI operates in British English and follows UK property management conventions.

## Database Storage

Documents are stored in the `building_documents` table with:

- File metadata (path, name, type, size)
- Extracted classification and category
- Key dates (inspection, due dates)
- Full AI analysis as JSON
- Building association
- User ownership

## Building Matching

The system automatically matches documents to buildings by:

1. Using provided `building_id` if available
2. Matching extracted `building_name` against existing buildings
3. Matching `building_postcode` for additional verification
4. Creating unlinked documents if no match found

## Reminders

For documents with `next_due_date`:

- Automatic reminder creation in `reminders` table
- Due date notifications
- Document type and classification tracking
- User and building association

## Error Handling

The system gracefully handles:

- **OCR Failures**: Returns structured error with follow-up suggestions
- **AI Failures**: Falls back to default classification with error flags
- **Validation Errors**: Returns detailed validation errors in development
- **Storage Failures**: Preserves analysis even if file upload fails

## Testing

The system includes comprehensive tests:

- **Unit Tests**: Zod validation, default result creation
- **Integration Tests**: Full API endpoint testing
- **OCR Testing**: Text extraction validation
- **AI Testing**: Mocked OpenAI responses

## Environment Variables

Required environment variables:

- `OPENAI_API_KEY` - For AI analysis
- `GOOGLE_CLOUD_VISION_CREDENTIALS` - For OCR fallback (optional)
- `NEXT_PUBLIC_AI_ENABLED` - Feature flag for AI processing

## Usage Examples

### Basic Upload
```javascript
const formData = new FormData();
formData.append('file', documentFile);

const response = await fetch('/api/document-intake', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

### With Building Context
```javascript
const formData = new FormData();
formData.append('file', documentFile);
formData.append('building_hint', 'Ashwood House');
formData.append('building_id', 'building-uuid');

const response = await fetch('/api/document-intake', {
  method: 'POST',
  body: formData
});
```

## Future Enhancements

- Support for DOCX, RTF, and other document formats
- Batch processing for multiple documents
- Advanced duplicate detection
- Integration with compliance tracking systems
- Automated filing suggestions based on document history
