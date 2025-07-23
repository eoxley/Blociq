# Compliance Document Management

This directory contains functions for managing compliance documents and their associated metadata in the BlocIQ system.

## saveComplianceDocument.ts

### Overview

The `saveComplianceDocument` function is a TypeScript utility that handles saving compliance documents to the database and updating related building compliance assets with renewal metadata. It provides two variants: a standard insert function and an upsert function for handling potential duplicates.

### Functions

#### `saveComplianceDocument(params)`

**Purpose**: Save a new compliance document and update building compliance asset metadata.

**Parameters**:
```typescript
{
  buildingId: number;           // The building ID
  complianceAssetId: string;    // The compliance asset ID
  fileUrl: string;              // Supabase public URL of uploaded file
  title: string;                // Document title extracted by AI
  summary: string;              // Document summary extracted by AI
  lastRenewedDate: string;      // Last renewal date (YYYY-MM-DD format)
  nextDueDate: string | null;   // Next due date (YYYY-MM-DD format) or null
}
```

**Returns**: `Promise<void>`

**Throws**: Error if database operations fail

#### `saveComplianceDocumentUpsert(params)`

**Purpose**: Alternative function using upsert to handle potential document re-uploads.

**Parameters**: Same as `saveComplianceDocument`

**Returns**: `Promise<void>`

**Throws**: Error if database operations fail

### Database Operations

The function performs the following database operations in sequence:

1. **Insert into `compliance_documents`**:
   ```sql
   INSERT INTO compliance_documents (
     building_id,
     compliance_asset_id,
     document_url,
     title,
     summary,
     extracted_date,
     doc_type,
     created_at,
     updated_at
   ) VALUES (...)
   ```

2. **Update `building_compliance_assets`**:
   ```sql
   UPDATE building_compliance_assets
   SET 
     last_renewed_date = ?,
     next_due_date = ?,
     latest_document_id = ?,
     last_updated = ?
   WHERE building_id = ? AND asset_id = ?
   ```

### Error Handling

- **Input Validation**: Validates all required parameters and date formats
- **Database Error Handling**: Catches and logs database operation errors
- **Rollback**: If the asset update fails, the inserted document is automatically deleted
- **Detailed Logging**: Comprehensive error logging for debugging

### Usage Examples

#### Basic Usage

```typescript
import { saveComplianceDocument } from '@/lib/compliance/saveComplianceDocument';

try {
  await saveComplianceDocument({
    buildingId: 123,
    complianceAssetId: 'eicr-certificate',
    fileUrl: 'https://supabase.co/storage/v1/object/public/documents/eicr-2024.pdf',
    title: 'Electrical Installation Condition Report',
    summary: 'Annual EICR inspection completed with satisfactory results',
    lastRenewedDate: '2024-06-15',
    nextDueDate: '2029-06-15'
  });
  
  console.log('Document saved successfully');
} catch (error) {
  console.error('Failed to save document:', error);
}
```

#### Using Upsert for Re-uploads

```typescript
import { saveComplianceDocumentUpsert } from '@/lib/compliance/saveComplianceDocument';

try {
  await saveComplianceDocumentUpsert({
    buildingId: 123,
    complianceAssetId: 'fire-safety-assessment',
    fileUrl: 'https://supabase.co/storage/v1/object/public/documents/fire-assessment-2024.pdf',
    title: 'Fire Safety Assessment Report',
    summary: 'Comprehensive fire safety assessment with recommendations',
    lastRenewedDate: '2024-03-20',
    nextDueDate: '2025-03-20'
  });
  
  console.log('Document upserted successfully');
} catch (error) {
  console.error('Failed to upsert document:', error);
}
```

#### Integration with AI Extraction

```typescript
import { saveComplianceDocument } from '@/lib/compliance/saveComplianceDocument';

// After AI extraction from /api/extract-compliance
const handleDocumentUpload = async (extractionResult: any, fileUrl: string) => {
  try {
    await saveComplianceDocument({
      buildingId: extractionResult.buildingId,
      complianceAssetId: extractionResult.complianceAssetId,
      fileUrl: fileUrl,
      title: extractionResult.title,
      summary: extractionResult.summary,
      lastRenewedDate: extractionResult.lastRenewedDate,
      nextDueDate: extractionResult.nextDueDate
    });
    
    // Update UI or show success message
  } catch (error) {
    // Handle error and show user feedback
  }
};
```

### Database Schema

#### compliance_documents Table

| Column | Type | Description |
|--------|------|-------------|
| id | string | Primary key (UUID) |
| building_id | number | Foreign key to buildings table |
| compliance_asset_id | string | Foreign key to compliance_assets table |
| document_url | string | Supabase storage URL |
| title | string | Document title |
| summary | string | Document summary |
| extracted_date | string | Date extracted from document |
| doc_type | string | Document type (default: 'compliance') |
| created_at | string | Creation timestamp |
| updated_at | string | Last update timestamp |

#### building_compliance_assets Table

| Column | Type | Description |
|--------|------|-------------|
| id | string | Primary key |
| building_id | number | Foreign key to buildings table |
| asset_id | string | Foreign key to compliance_assets table |
| status | string | Compliance status |
| notes | string | Additional notes |
| next_due_date | string | Next due date |
| last_updated | string | Last update timestamp |
| latest_document_id | string | Foreign key to latest compliance_documents |
| last_renewed_date | string | Last renewal date |

### Validation Rules

1. **Required Parameters**: All parameters must be provided and non-empty
2. **Date Format**: Dates must be in ISO format (YYYY-MM-DD)
3. **Building ID**: Must be a valid number
4. **Compliance Asset ID**: Must be a valid string
5. **File URL**: Must be a valid Supabase storage URL

### Error Messages

Common error messages and their causes:

- `"Missing required parameters for saving compliance document"` - One or more required parameters are missing
- `"lastRenewedDate must be in ISO format (YYYY-MM-DD)"` - Invalid date format
- `"Failed to insert compliance document: ..."` - Database insert error
- `"Failed to update building compliance asset: ..."` - Database update error
- `"Failed to get inserted document ID"` - Unexpected database response

### Performance Considerations

- **Transaction Safety**: Uses rollback mechanism if update fails
- **Error Logging**: Comprehensive logging for debugging
- **Type Safety**: Full TypeScript support with database types
- **Validation**: Input validation before database operations

### Security

- **Input Validation**: All inputs are validated before processing
- **SQL Injection Protection**: Uses Supabase client with parameterized queries
- **Error Handling**: Sensitive error information is logged but not exposed to users

### Testing

To test the function:

```typescript
// Test with valid data
const testData = {
  buildingId: 1,
  complianceAssetId: 'test-asset',
  fileUrl: 'https://example.com/test.pdf',
  title: 'Test Document',
  summary: 'Test summary',
  lastRenewedDate: '2024-01-01',
  nextDueDate: '2025-01-01'
};

await saveComplianceDocument(testData);

// Test with invalid data
try {
  await saveComplianceDocument({
    ...testData,
    lastRenewedDate: 'invalid-date'
  });
} catch (error) {
  console.log('Expected error:', error.message);
}
```

### Future Enhancements

1. **Batch Operations**: Support for saving multiple documents at once
2. **Document Versioning**: Track document versions and changes
3. **Audit Trail**: Log all document operations for compliance
4. **File Validation**: Validate file types and sizes before saving
5. **Async Processing**: Support for background document processing
6. **Caching**: Cache frequently accessed document metadata 