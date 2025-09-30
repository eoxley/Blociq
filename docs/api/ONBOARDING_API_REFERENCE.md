# Onboarding Module API Reference

## Overview

The Onboarding Module provides a three-stage API workflow for AI-powered data extraction and review:

1. **Upload** → Raw file storage and metadata
2. **Extract** → AI analysis and structured data extraction  
3. **Review** → Human review and approval
4. **Commit** → Production table insertion

## API Endpoints

### 1. Upload Files
**POST** `/api/onboarding/upload`

Uploads raw files and saves metadata to `onboarding_raw` table.

#### Request
```typescript
// FormData with file and optional metadata
const formData = new FormData();
formData.append('file', file);
formData.append('batchId', 'uuid'); // optional
formData.append('buildingName', 'string'); // optional
formData.append('notes', 'string'); // optional
```

#### Response
```typescript
{
  success: true,
  data: {
    id: "uuid",
    fileName: "document.pdf",
    fileSize: 1024000,
    fileType: "application/pdf",
    uploadUrl: "https://...",
    processingStatus: "pending"
  }
}
```

#### Supported File Types
- PDF: `application/pdf`
- Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Word: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Text: `text/plain`, `text/csv`

#### File Limits
- Maximum size: 50MB
- Validation: File type and size checking

---

### 2. Extract Data
**POST** `/api/onboarding/extract`

Triggers AI analysis and extracts structured data from uploaded files.

#### Request
```typescript
{
  rawId: "uuid" // ID from upload response
}
```

#### Response
```typescript
{
  success: true,
  data: {
    rawId: "uuid",
    structuredId: "uuid",
    detectedType: "lease",
    suggestedTable: "leases",
    confidence: 0.95,
    extractedData: {
      // Structured data matching target table schema
    }
  }
}
```

#### AI Processing
- **Document Classification**: Identifies document type (lease, FRA, apportionment, etc.)
- **Text Extraction**: Extracts content from various file formats
- **Data Structuring**: Maps content to appropriate production tables
- **Confidence Scoring**: Provides accuracy metrics (0.0-1.0)

#### Target Tables
- `buildings` - Building information
- `units` - Unit details
- `leaseholders` - Contact information
- `leases` - Lease terms
- `unit_apportionments` - Service charges
- `building_compliance_assets` - Compliance docs
- `building_documents` - Document library
- `clients` - Client information
- `rmc_directors` - Director appointments

---

### 3. Review Data
**POST** `/api/onboarding/review`

Accepts, rejects, or edits extracted data (without committing to production).

#### Request
```typescript
{
  structuredId: "uuid",
  action: "accept" | "reject" | "edit",
  editedData?: object, // Required for 'edit' action
  reviewNotes?: "string"
}
```

#### Response
```typescript
{
  success: true,
  data: {
    id: "uuid",
    status: "accepted",
    reviewer_id: "uuid",
    reviewed_at: "2024-01-01T00:00:00Z",
    review_notes: "Data looks accurate"
  }
}
```

#### Actions
- **`accept`**: Approves data for production commit
- **`reject`**: Rejects data with optional notes
- **`edit`**: Modifies extracted data before approval

---

### 4. Commit to Production
**POST** `/api/onboarding/commit`

Commits accepted data to production tables.

#### Request
```typescript
{
  structuredIds: ["uuid1", "uuid2", "uuid3"] // Array of accepted records
}
```

#### Response
```typescript
{
  success: true,
  results: [
    {
      structuredId: "uuid1",
      success: true,
      productionTable: "leases",
      productionId: "uuid"
    }
  ],
  errors: [
    {
      structuredId: "uuid2",
      error: "Validation failed"
    }
  ],
  summary: {
    total: 3,
    successful: 2,
    failed: 1
  }
}
```

#### Process
1. Validates records are in `accepted` status
2. Cleans data for target production table
3. Inserts into production table
4. Updates staging record with commit metadata
5. Returns batch results with success/error details

---

## Query Endpoints

### List Uploads
**GET** `/api/onboarding/upload`

Lists uploaded files with filtering options.

#### Query Parameters
- `batchId` - Filter by batch
- `status` - Filter by processing status
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset (default: 0)

### List Extractions
**GET** `/api/onboarding/extract`

Lists extracted structured records.

#### Query Parameters
- `rawId` - Filter by raw file
- `status` - Filter by review status
- `suggestedTable` - Filter by target table
- `limit` - Results per page
- `offset` - Pagination offset

### List Reviews
**GET** `/api/onboarding/review`

Lists records pending review.

#### Query Parameters
- `batchId` - Filter by batch
- `status` - Filter by status (default: 'pending')
- `suggestedTable` - Filter by target table
- `limit` - Results per page
- `offset` - Pagination offset

### List Commits
**GET** `/api/onboarding/commit`

Lists committed records.

#### Query Parameters
- `batchId` - Filter by batch
- `committed` - Filter by commit status
- `limit` - Results per page
- `offset` - Pagination offset

---

## Batch Management

### Create Batch
**POST** `/api/onboarding/batches`

Creates a new onboarding batch for organizing related uploads.

#### Request
```typescript
{
  batchName: "Building ABC Onboarding",
  buildingName?: "123 Main Street" // optional
}
```

### List Batches
**GET** `/api/onboarding/batches`

Lists batches with optional statistics.

#### Query Parameters
- `status` - Filter by batch status
- `includeStats` - Include processing statistics
- `limit` - Results per page
- `offset` - Pagination offset

### Update Batch
**PUT** `/api/onboarding/batches`

Updates batch details and status.

#### Request
```typescript
{
  batchId: "uuid",
  batchName?: "Updated Name",
  buildingName?: "Updated Building",
  status?: "completed"
}
```

### Delete Batch
**DELETE** `/api/onboarding/batches?batchId=uuid`

Deletes empty batches (with safety checks).

---

## Error Handling

### Common Error Responses
```typescript
{
  error: "Error message",
  details?: "Additional error details"
}
```

### Status Codes
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (super_admin role required)
- `404` - Not Found
- `500` - Internal Server Error

### Validation Errors
- File type not supported
- File size exceeds limit
- Required fields missing
- Invalid action specified
- Record not found
- Already processed/committed

---

## Security

### Authentication
- All endpoints require valid Supabase authentication
- User must be logged in with valid session

### Authorization
- All functionality restricted to `role = 'super_admin'`
- Row Level Security (RLS) enforced at database level
- API endpoints verify super_admin role before processing

### File Security
- File type validation prevents malicious uploads
- Size limits prevent resource exhaustion
- Secure storage with access controls
- File hash deduplication

---

## Usage Examples

### Complete Workflow
```typescript
// 1. Create batch
const batch = await fetch('/api/onboarding/batches', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    batchName: 'Building ABC Onboarding',
    buildingName: '123 Main Street'
  })
});

// 2. Upload file
const formData = new FormData();
formData.append('file', leaseFile);
formData.append('batchId', batch.data.id);

const upload = await fetch('/api/onboarding/upload', {
  method: 'POST',
  body: formData
});

// 3. Extract data
const extract = await fetch('/api/onboarding/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rawId: upload.data.id })
});

// 4. Review data
const review = await fetch('/api/onboarding/review', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    structuredId: extract.data.structuredId,
    action: 'accept',
    reviewNotes: 'Data looks accurate'
  })
});

// 5. Commit to production
const commit = await fetch('/api/onboarding/commit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    structuredIds: [extract.data.structuredId]
  })
});
```

### Bulk Operations
```typescript
// Bulk accept multiple records
const acceptMultiple = await fetch('/api/onboarding/review', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    structuredId: 'uuid1',
    action: 'accept'
  })
});

// Bulk commit accepted records
const commitMultiple = await fetch('/api/onboarding/commit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    structuredIds: ['uuid1', 'uuid2', 'uuid3']
  })
});
```

---

## Integration Notes

### Frontend Integration
- Use FormData for file uploads
- Handle async processing with status polling
- Implement progress indicators for bulk operations
- Provide clear error messages and validation feedback

### Error Recovery
- Implement retry logic for transient failures
- Provide manual intervention options
- Maintain audit trail for troubleshooting
- Support rollback for committed data

### Performance Considerations
- Batch operations for multiple records
- Pagination for large result sets
- Async processing for AI operations
- Caching for frequently accessed data
