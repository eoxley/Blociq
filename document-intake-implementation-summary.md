# Document Intake System Implementation Summary

## Overview
Implemented a comprehensive document intake system with two endpoints and an 'ingest' brain mode for processing, analyzing, and linking uploaded documents to the BlocIQ system.

## New Endpoints Created

### 1. `/api/documents/process` - Document Processing
**Purpose**: Downloads files, extracts text, and analyzes documents using AI

**Input**:
```typescript
{
  file_url: string;
  building_id?: string;
  unit_id?: string;
  leaseholder_id?: string;
}
```

**Process**:
1. Downloads file from Supabase Storage
2. Extracts text using OCR/text extraction
3. Calls `/api/ask-blociq` with `mode: "ingest"`
4. Saves document to `building_documents` with analysis
5. Creates chunks and embeddings for search

**Output**:
```typescript
{
  document_id: string;
  file_name: string;
  full_text: string;
  content_summary: string;
  type: string;
  confidence: number;
  suggested_action: string;
  extracted: any;
  auto_linked_building_id?: string;
  is_unlinked: boolean;
  ocr_used: boolean;
}
```

### 2. `/api/documents/confirm` - Document Confirmation
**Purpose**: Links documents and executes suggested actions

**Input**:
```typescript
{
  document_id: string;
  accepted: boolean;
  override?: {
    building_id?: string;
    unit_id?: string;
    leaseholder_id?: string;
  };
  apply_actions?: string[];
}
```

**Process**:
1. Links document to building/unit/leaseholder
2. For compliance documents: updates `compliance_documents` and `building_compliance_assets`
3. Executes selected actions (create tasks, send emails)
4. Logs all actions to `ai_tool_calls`

**Output**:
```typescript
{
  document_id: string;
  linked: boolean;
  updates_summary: {
    compliance_updated?: boolean;
    tasks_created?: number;
    emails_sent?: number;
    actions_executed: string[];
  };
}
```

## Enhanced `/api/ask-blociq` with 'ingest' Mode

### New Mode: 'ingest'
**Purpose**: Analyzes documents for classification and key information extraction

**Input**:
```typescript
{
  mode: 'ingest';
  message: string;
  file_text: string;
  building_id?: string;
  unit_id?: string;
  leaseholder_id?: string;
}
```

**Output**:
```typescript
{
  answer: string;
  classification: string;
  confidence: number;
  guesses: {
    building_id?: string;
    unit_id?: string;
    leaseholder_id?: string;
    compliance_asset_id?: string;
  };
  extracted_fields: {
    issued_date?: string;
    expiry_date?: string;
    last_renewed_date?: string;
    next_due_date?: string;
    supplier?: string;
    certificate_number?: string;
    amount?: string;
  };
  proposed_actions: Array<{type, args}>;
  citations: Array<{document_id, chunk_id, snippet}>;
}
```

## OCR Integration

### `lib/ai/ocr.ts`
- **Placeholder OCR function** ready for Google Vision API integration
- **Text extraction** from PDFs, images, and text files
- **OCR tracking** to know when OCR was used vs. direct text extraction

**Functions**:
- `ocrExtract(fileBuffer)`: Placeholder for Google Vision integration
- `extractTextFromFile(fileBuffer, fileType)`: Main extraction function

## Database Integration

### Tables Used
- **`building_documents`**: Document storage with analysis results
- **`doc_chunks`**: Document chunks for search and retrieval
- **`compliance_documents`**: Compliance document tracking
- **`building_compliance_assets`**: Compliance asset management
- **`building_todos`**: Task creation from document analysis
- **`ai_tool_calls`**: Action execution logging

### Document Processing Flow
1. **Upload** → Supabase Storage
2. **Process** → Text extraction + AI analysis
3. **Chunk** → Create searchable chunks
4. **Confirm** → Link + execute actions
5. **Audit** → Log all actions

## Security & Quality

### Authentication
- All endpoints require authenticated user
- Uses Supabase auth with session validation

### Error Handling
- Comprehensive try/catch blocks
- Structured JSON error responses
- Graceful handling of missing files/data

### Data Validation
- Required field validation
- File type validation
- Confidence-based auto-linking

## API Usage Examples

### Process Document
```javascript
POST /api/documents/process
{
  "file_url": "documents/fire-safety-cert.pdf",
  "building_id": "123",
  "unit_id": "456"
}
```

### Confirm Document
```javascript
POST /api/documents/confirm
{
  "document_id": "doc-123",
  "accepted": true,
  "override": {
    "building_id": "123"
  },
  "apply_actions": ["update_compliance_dates", "create_task"]
}
```

### Direct Ingest Analysis
```javascript
POST /api/ask-blociq
{
  "mode": "ingest",
  "message": "Analyse this document",
  "file_text": "Fire Safety Certificate...",
  "building_id": "123"
}
```

## Testing

Run the test suite:
```bash
node test-document-intake.js
```

Tests cover:
- Document processing workflow
- Document confirmation and linking
- Direct ingest mode analysis
- Error handling and edge cases

## Future Enhancements

1. **Google Vision Integration**: Replace placeholder OCR with Google Vision API
2. **PDF Text Extraction**: Implement proper PDF text extraction
3. **Batch Processing**: Process multiple documents in one request
4. **Advanced Classification**: More sophisticated document classification
5. **Template Matching**: Match documents against known templates
6. **Compliance Rules**: Automatic compliance rule checking
7. **Document Versioning**: Track document versions and changes

## Environment Variables Required

- `OPENAI_API_KEY`: For AI analysis and embeddings
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase connection
- `SUPABASE_SERVICE_ROLE_KEY`: Database access
- `NEXT_PUBLIC_AI_ENABLED`: Feature flag control
- `GOOGLE_VISION_API_KEY`: (Future) For OCR functionality

## Files Created/Modified

### New Files
1. **`lib/ai/ocr.ts`**: OCR placeholder and text extraction
2. **`app/api/documents/process/route.ts`**: Document processing endpoint
3. **`app/api/documents/confirm/route.ts`**: Document confirmation endpoint
4. **`test-document-intake.js`**: Test suite for document intake

### Modified Files
1. **`app/api/ask-blociq/route.ts`**: Added 'ingest' mode support
2. **`lib/ai/systemPrompt.ts`**: Added ingest mode instructions

## Integration Points

- **Supabase Storage**: File download and storage
- **AI Analysis**: Document classification and extraction
- **Compliance System**: Automatic compliance document handling
- **Task Management**: Automatic task creation from documents
- **Email System**: Automatic email notifications
- **Search System**: Document chunking and embedding
- **Audit Trail**: Complete action logging
