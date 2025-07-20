# AI Document Handling System

## Overview

The AI Document Handling System provides intelligent PDF processing for UK leasehold block management, with user-controlled confirmation before saving data. The system extracts text, generates summaries, classifies documents, and extracts metadata while ensuring users maintain full control over the final data.

## Features

### 1. Intelligent Document Processing
- **Text Extraction**: Uses OpenAI's PDF processing to extract text from uploaded PDFs
- **AI Classification**: Automatically classifies documents as Compliance, Lease, Minutes, Insurance, Financial, or Other
- **Summary Generation**: Creates concise, readable summaries of document content
- **Metadata Extraction**: Extracts key dates, responsible parties, contractors, and action items
- **Compliance Asset Linking**: Suggests appropriate compliance assets for linking

### 2. User-Controlled Confirmation
- **Preview Interface**: Shows AI analysis results before saving
- **Editable Fields**: Users can modify all AI-generated information
- **Accept & File**: Explicit user confirmation required before saving
- **Cancel Option**: Users can discard AI analysis and start over

### 3. RLS-Safe Implementation
- **User Authentication**: Validates user permissions before processing
- **Building Access Control**: Ensures users can only access authorized buildings
- **Secure File Storage**: Files stored in user-specific Supabase storage buckets

## System Architecture

### API Endpoints

#### `/api/upload-and-analyse` (POST)
Handles PDF upload, text extraction, and AI analysis.

**Request:**
```typescript
FormData {
  file: File (PDF)
  buildingId?: string
}
```

**Response:**
```typescript
{
  success: boolean
  ai: {
    classification: string
    document_type: string
    summary: string
    inspection_date: string | null
    next_due_date: string | null
    responsible_party: string
    action_required: string
    confidence: number
    suggested_compliance_asset: string | null
    contractor_name: string | null
    building_name: string | null
    key_dates: string[]
    key_entities: string[]
    originalFileName: string
    buildingId: string | null
    extractedText: string
    file_url: string
  }
}
```

#### `/api/documents/confirm-file` (POST)
Handles user confirmation and saves document with all metadata.

**Request:**
```typescript
FormData {
  file_url: string
  document_type: string
  classification: string
  summary: string
  inspection_date: string
  next_due_date: string
  responsible_party: string
  action_required: string
  contractor_name: string
  confidence: string
  suggested_compliance_asset: string
  building_id?: string
  unit_id?: string
  leaseholder_id?: string
}
```

**Response:**
```typescript
{
  success: boolean
  document_id: string
  building_id: number | null
  message: string
}
```

### Database Tables

#### `building_documents`
Stores uploaded documents with metadata:
```sql
CREATE TABLE building_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id INTEGER REFERENCES buildings(id),
  unit_id INTEGER REFERENCES units(id),
  leaseholder_id UUID REFERENCES leaseholders(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  type TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `compliance_assets`
Predefined compliance categories for linking:
```sql
CREATE TABLE compliance_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `building_compliance_assets`
Links buildings to compliance assets with status:
```sql
CREATE TABLE building_compliance_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id INTEGER REFERENCES buildings(id),
  asset_id UUID REFERENCES compliance_assets(id),
  status TEXT NOT NULL,
  notes TEXT,
  next_due_date DATE,
  last_updated TIMESTAMP DEFAULT NOW()
);
```

## Usage Flow

### 1. Document Upload
```typescript
// User selects PDF file
const file = event.target.files[0];

// Upload and analyze
const formData = new FormData();
formData.append('file', file);
formData.append('buildingId', buildingId);

const response = await fetch('/api/upload-and-analyse', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

### 2. User Confirmation
```typescript
// Show confirmation dialog with AI results
setAiResult(result.ai);
setShowConfirmation(true);

// User can edit fields
const updateField = (field, value) => {
  setEditableFields(prev => ({
    ...prev,
    [field]: value
  }));
};
```

### 3. Accept & File
```typescript
// User confirms and saves
const formData = new FormData();
formData.append('file_url', aiResult.file_url);
formData.append('document_type', editableFields.document_type);
// ... other fields

const response = await fetch('/api/documents/confirm-file', {
  method: 'POST',
  body: formData
});
```

## Security Features

### Row Level Security (RLS)
- Users can only access documents for buildings they have permission to view
- File storage paths include user ID for isolation
- All database operations validate user permissions

### File Security
- Files stored in Supabase storage with user-specific paths
- Public URLs generated for document access
- File type validation (PDF only)

### API Security
- Authentication required for all endpoints
- Input validation and sanitization
- Error handling without exposing sensitive information

## Supported Document Types

### Compliance Documents
- Fire Risk Assessments
- Electrical Installation Condition Reports (EICR)
- Gas Safety Certificates
- Asbestos Surveys
- Legionella Risk Assessments
- Lift Safety Certificates (LOLER)

### Legal Documents
- Lease Agreements
- Assignment Documents
- Service Charge Demands
- Section 20 Notices

### Administrative Documents
- AGM Minutes
- Board Meeting Minutes
- Insurance Certificates
- Planning Permissions

### Financial Documents
- Service Charge Statements
- Budget Documents
- Accounts

## Setup Instructions

### 1. Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

### 2. Database Setup
Run the seed script to create compliance assets:
```bash
npx tsx scripts/seedComplianceAssets.ts
```

### 3. Storage Bucket
Create a `building-documents` bucket in Supabase storage with appropriate RLS policies.

### 4. RLS Policies
Ensure appropriate RLS policies are in place for:
- `building_documents` table
- `compliance_assets` table
- `building_compliance_assets` table
- Storage bucket access

## Error Handling

### Common Errors
- **File Upload Failed**: Check storage bucket permissions and file size limits
- **Text Extraction Failed**: Document may be scanned or corrupted
- **AI Analysis Failed**: Check OpenAI API key and quota
- **Permission Denied**: User doesn't have access to the specified building

### Fallback Behavior
- If AI analysis fails, system provides basic document type detection
- Users can manually edit all fields
- System continues to work even if compliance linking fails

## Performance Considerations

### File Size Limits
- Maximum file size: 10MB
- Recommended: Under 5MB for optimal processing
- Large files may take longer to process

### Processing Time
- Text extraction: 5-15 seconds
- AI analysis: 10-30 seconds
- Total processing time: 15-45 seconds

### Caching
- AI analysis results are not cached (user-specific)
- File URLs are cached by Supabase storage

## Future Enhancements

### Planned Features
- **Batch Upload**: Process multiple documents simultaneously
- **OCR Enhancement**: Better handling of scanned documents
- **Template Recognition**: Identify document templates and forms
- **Automated Reminders**: Set up reminders based on extracted dates
- **Document Versioning**: Track document updates and changes

### Integration Opportunities
- **Email Integration**: Process documents from email attachments
- **Calendar Integration**: Create calendar events from extracted dates
- **Workflow Automation**: Trigger actions based on document types
- **Reporting**: Generate compliance reports from document data

## Troubleshooting

### Debug Mode
Enable debug logging by setting:
```bash
NODE_ENV=development
```

### Common Issues
1. **File not uploading**: Check storage bucket permissions
2. **AI not responding**: Verify OpenAI API key and quota
3. **Permission errors**: Check user's building access
4. **Database errors**: Verify RLS policies and table structure

### Support
For issues with the AI document handling system, check:
1. Browser console for client-side errors
2. Server logs for API errors
3. Supabase dashboard for database errors
4. OpenAI dashboard for API usage and errors 