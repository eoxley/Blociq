# Major Works Upload Function

A comprehensive document upload and classification system for UK leasehold Major Works Section 20 consultation documents.

## 🏗️ Overview

The Major Works upload function reuses the existing Lease Lab OCR pipeline while adding specialized logic for Section 20 consultation documents. It provides intelligent document classification, automatic metadata extraction, Outlook integration, and full audit trails.

## 🔧 Architecture

### API Endpoints

- **`/api/major-works/upload`** - Main upload and analysis endpoint
- **`/api/major-works/confirm`** - User confirmation and audit logging

### Components

- **`MajorWorksUploadModal`** - React component for document upload with user confirmation
- **`/app/major-works/page.tsx`** - Test page demonstrating functionality

## 📁 Storage Structure

Documents are stored in the `building_documents` Supabase bucket with the following path structure:

```
/{buildingId}/major_works/{timestamp}_{originalFileName}
```

Example: `123/major_works/1234567890_Section20_Notice.pdf`

## 🤖 AI Classification

The system uses OpenAI GPT-4o-mini to classify documents into Section 20 stages:

### Supported Document Types

1. **Notice of Intention** (Stage 1)
   - Initial notice to leaseholders about proposed works
   - Creates 90-day consultation timeline
   - Auto-generates calendar reminder for deadline

2. **Statement of Estimates** (Stage 2)
   - Detailed costs and contractor quotes
   - Extracts contractor names and estimated costs
   - Flags requirement for leaseholder summary

3. **Award of Contract** (Stage 3)
   - Notification of selected contractor
   - Sets project to active status
   - Schedules works commencement reminders

4. **Works Order**
   - Formal instruction to commence works
   - Activates progress monitoring phase

5. **Completion Certificate**
   - Works completed notification
   - Triggers final account preparation

6. **Final Account**
   - Final costs and leaseholder charges
   - Enables project closure

### Extracted Metadata

For each document, the AI extracts:

- **stage**: Section 20 consultation stage
- **building_name**: Building name/address from document
- **estimated_cost**: Total project cost (if mentioned)
- **contractors**: Array of contractor names
- **leaseholder_thresholds**: Contribution caps/limits
- **works_description**: Brief description of proposed works
- **consultation_period_days**: Consultation period length
- **start_date**: Proposed/actual start date
- **completion_date**: Expected/actual completion date
- **confidence**: AI confidence score (0-100)

## 💾 Database Integration

### building_documents Table

```sql
INSERT INTO building_documents (
  name,                    -- Original filename
  file_path,              -- Storage path in bucket
  building_id,            -- Link to buildings table
  uploaded_by,            -- User ID
  document_type,          -- 'major_works'
  category,               -- 'major_works'
  file_size,              -- File size in bytes
  ocr_status,             -- 'completed'
  ocr_text,               -- Extracted text (first 65535 chars)
  metadata                -- JSON with AI analysis results
)
```

### major_works_projects Table

Links documents to Major Works projects:

```sql
-- Create new project or link to existing
INSERT INTO major_works_projects (
  building_id,
  title,
  stage,
  estimated_cost,
  consultation_period_days,
  start_date,
  completion_date,
  status,
  created_by
)
```

### major_works_documents Table

Junction table linking projects to documents:

```sql
INSERT INTO major_works_documents (
  project_id,
  document_id,
  stage,
  uploaded_by
)
```

## 📧 Outlook Integration

### Automatic Calendar Events

The system creates calendar events based on document stage:

#### Notice of Intention
```typescript
{
  subject: "Section 20 Notice Period Ends - {Building Name}",
  start: consultationEndDate,
  importance: "high",
  body: "Review responses and proceed with next steps"
}
```

#### Statement of Estimates
```typescript
{
  subject: "Leaseholder Summary Due - {Building Name}",
  start: summaryDueDate,
  importance: "normal",
  body: "Prepare and send leaseholder summary for estimates"
}
```

#### Award of Contract
```typescript
{
  subject: "Works Start - {Building Name}",
  start: worksStartDate,
  importance: "high",
  body: "Ensure site access and contractor coordination"
}
```

### Email Draft Generation

AI-generated email templates for leaseholders:

```typescript
{
  to: "leaseholders",
  subject: "Major Works - Section 20 {Stage} - {Building Name}",
  body: aiGeneratedContent,
  attachments: [uploadedDocument]
}
```

## 🔍 OCR Pipeline

Reuses the existing Lease Lab OCR system with intelligent method selection:

1. **PDF Text Layer** (fastest) - Direct text extraction
2. **OpenAI File API** - Cloud-based extraction
3. **Google Vision OCR** - For scanned documents

### Method Selection

The system analyzes document characteristics and selects optimal extraction methods based on:

- Document quality (high/medium/low)
- Presence of text layer
- File size and complexity
- Document type indicators

## ✅ User Confirmation Flow

### Upload Process

1. **Document Upload** - File uploaded to storage bucket
2. **OCR Analysis** - Text extraction using intelligent method selection
3. **AI Classification** - Major Works-specific analysis and metadata extraction
4. **User Review** - Confirmation modal with extracted data
5. **User Decision** - Accept classification or mark for manual review
6. **Automation** - Trigger calendar events, emails, and project updates

### Confirmation Modal

Displays:
- Detected document stage with confidence score
- Extracted metadata (costs, contractors, dates)
- Recommended next steps
- Outlook integration preview
- Accept/Reject options

### Audit Trail

All actions logged in `major_works_logs`:

```sql
INSERT INTO major_works_logs (
  document_id,
  building_id,
  user_id,
  action,                 -- 'document_uploaded', 'classification_confirmed', etc.
  details                 -- JSON with full context
)
```

## 🚀 Usage Example

```typescript
// Open upload modal
<MajorWorksUploadModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  buildingId="123"
  buildingName="Ashwood Tower"
  onUploadComplete={(result) => {
    console.log('Upload completed:', result)
    // Refresh major works list
  }}
/>
```

### API Response

```json
{
  "success": true,
  "type": "major_works_upload",
  "document": {
    "id": "doc_123",
    "filename": "Section20_Notice.pdf",
    "public_url": "https://...",
    "file_size": 1048576
  },
  "analysis": {
    "stage": "Notice of Intention",
    "building_name": "Ashwood Tower",
    "estimated_cost": 75000,
    "contractors": ["ABC Construction", "XYZ Builders"],
    "consultation_period_days": 90,
    "confidence": 92
  },
  "project": {
    "id": "proj_456",
    "linked": true
  },
  "outlook_integration": {
    "calendar_events": [...],
    "email_drafts": [...]
  },
  "next_steps": [
    "Wait for leaseholder consultation period to end",
    "Review any leaseholder responses or objections",
    "Prepare Statement of Estimates"
  ]
}
```

## 🔒 Security & Validation

### File Validation

- **Supported formats**: PDF, Word (.docx, .doc), Images (JPG, PNG)
- **Size limit**: 50MB maximum
- **MIME type verification**: Validates file types
- **Authentication**: Requires valid user session

### Data Protection

- **User isolation**: Files stored with user ID prefix
- **RLS**: Row Level Security on all database tables
- **Audit logging**: Full audit trail of all actions
- **Error handling**: Comprehensive error handling with fallbacks

## 🔧 Configuration

### Environment Variables

```env
OPENAI_API_KEY=sk-...                    # OpenAI API for text analysis
NEXT_PUBLIC_SUPABASE_URL=https://...     # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=...            # Service role for server operations
```

### Supabase Storage Bucket

Ensure `building-documents` bucket exists with:
- **Public access**: Enabled for file downloads
- **File size limit**: 50MB
- **Allowed MIME types**: PDF, Word, Images

## 🧪 Testing

### Test the Major Works Upload

1. Navigate to `http://localhost:3001/major-works`
2. Select a building from the dropdown
3. Click "Upload Document"
4. Drag and drop a Section 20 document
5. Click "Upload & Analyze"
6. Review AI classification results
7. Confirm or reject the classification

### Expected Behavior

- Document uploads to correct storage path
- AI correctly identifies Section 20 stage
- Metadata extracted accurately
- User confirmation modal displays
- Audit trail created upon confirmation
- Calendar events and emails generated (if applicable)

## 🔄 Integration Points

### Existing Systems

- **Lease Lab OCR**: Reuses text extraction pipeline
- **Supabase Storage**: Uses existing building-documents bucket
- **Authentication**: Integrates with existing auth system
- **Outlook**: Leverages existing email/calendar integration

### Database Schema

Requires tables:
- `building_documents` (existing)
- `major_works_projects` (new)
- `major_works_documents` (new junction table)
- `major_works_logs` (new audit table)
- `calendar_events` (existing/new)
- `email_templates` (existing/new)

## 📊 Analytics & Reporting

Track metrics:
- Document classification accuracy
- Processing times by OCR method
- User confirmation rates
- Project progression through stages
- Outlook integration usage

## 🚀 Future Enhancements

- **Batch upload**: Multiple documents at once
- **Template matching**: Recognize standard Section 20 templates
- **Cost analysis**: Compare estimates across contractors
- **Automatic reminders**: SMS/email notifications for deadlines
- **Mobile app**: React Native version for site uploads
- **Integration**: Connect to project management tools

## 📝 Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify all environment variables are set
3. Ensure Supabase bucket permissions are correct
4. Check AI model availability and quotas
5. Review audit logs for processing history