# General Document Upload Function

A flexible document upload and classification system for any type of building management document with AI-powered categorization, metadata extraction, and intelligent Outlook integration.

## 🔧 Overview

The General Document Upload function reuses the proven Lease Lab OCR pipeline while adding flexible AI classification for any document type. It automatically categorizes documents, extracts relevant metadata, creates appropriate Outlook integrations, and provides comprehensive audit trails with user confirmation workflows.

## 🏗️ Architecture

### API Endpoints

- **`/api/documents/general/upload`** - Main upload, OCR, and AI analysis endpoint
- **`/api/documents/general/confirm`** - User confirmation and override handling

### Components

- **`GeneralDocumentUploadModal`** - React component with drag-and-drop upload and confirmation flow
- **`/app/documents/general/page.tsx`** - Demonstration page with features overview

## 📁 Storage Structure

Documents are stored in the `building_documents` Supabase bucket with:

```
/{buildingId}/general/{timestamp}_{originalFileName}
```

Example: `123/general/1234567890_Insurance_Policy.pdf`

## 🤖 AI Classification System

### Supported Document Types

The AI automatically classifies documents into these categories:

1. **`insurance_policy`**
   - Building insurance, liability policies
   - **Automation**: Calendar reminders 30 & 7 days before expiry
   - **Metadata**: Policy number, insurer, coverage amount, premium

2. **`meeting_minutes`**
   - Board meetings, AGM, EGM minutes
   - **Automation**: Email drafts to directors with AI summary
   - **Metadata**: Meeting type, attendees, key decisions

3. **`contract`**
   - Service agreements, maintenance contracts
   - **Automation**: Review tasks created (14-day default deadline)
   - **Metadata**: Contractor, service type, value, duration

4. **`general_correspondence`**
   - Letters, emails, notices
   - **Automation**: Automated filing and categorization
   - **Metadata**: Sender, topic, urgency level

5. **`maintenance_report`**
   - Inspection reports, repair assessments
   - **Automation**: Action item tracking and follow-ups
   - **Metadata**: Inspector, issues found, recommendations

6. **`financial_statement`**
   - Accounts, budgets, financial reports
   - **Automation**: Director notifications and summaries
   - **Metadata**: Period, balance, variances

7. **`legal_notice`**
   - Court orders, legal correspondence
   - **Automation**: Urgent review alerts and priority tracking
   - **Metadata**: Legal authority, deadline, case reference

8. **`survey_report`**
   - Building surveys, condition assessments
   - **Automation**: Maintenance scheduling based on findings
   - **Metadata**: Surveyor, condition rating, recommendations

9. **`contractor_quote`**
   - Quotes, estimates, proposals
   - **Automation**: Quote comparison tasks (7-day review period)
   - **Metadata**: Contractor, work description, quoted amount

10. **`other`**
    - Fallback for unclassified documents
    - **Automation**: General review reminders if expiry date found

### AI Analysis Process

For each document, the AI extracts:

```typescript
interface GeneralDocumentAnalysis {
  document_type: string;           // One of the 10 supported types
  document_date?: string;          // Document creation date
  expiry_date?: string;            // Renewal/expiry date if applicable
  parties_involved: string[];      // Companies, people, organizations (max 5)
  keywords: string[];              // Important keywords/topics (max 10)
  summary: string;                 // Brief content summary (max 150 words)
  confidence: number;              // AI confidence score (0-100)
  metadata: Record<string, any>;   // Type-specific additional data
}
```

## 💾 Database Integration

### building_documents Table

```sql
INSERT INTO building_documents (
  file_name,              -- Original filename (not title)
  storage_path,           -- Full path in bucket
  building_id,            -- Link to buildings table
  uploaded_by,            -- User ID
  document_type,          -- AI-detected type
  category,               -- 'general'
  file_size,              -- File size in bytes
  ocr_status,             -- 'completed'
  ocr_text,               -- Extracted text (first 65535 chars)
  metadata                -- JSON with full analysis results
)
```

### document_logs Audit Trail

```sql
INSERT INTO document_logs (
  document_id,
  building_id,
  user_id,
  action,                 -- 'document_uploaded', 'classification_confirmed', etc.
  document_type,          -- Final classification
  ai_extraction_raw,      -- Raw OCR text
  ai_analysis,            -- Complete AI analysis
  outlook_event_id,       -- Calendar event ID if created
  outlook_task_id,        -- Task ID if created
  outlook_email_draft_id, -- Email draft ID if created
  user_confirmation,      -- User acceptance/override
  created_at
)
```

## 📧 Outlook Integration

### Automatic Calendar Events

#### Insurance Policies
```typescript
{
  title: "📅 [Building] Insurance Renewal",
  start_time: expiry_date,
  reminder_minutes: [43200, 10080], // 30 days and 7 days before
  description: "Policy expires today. Review and renew.\n\nInsurer: [insurer]\nPolicy: [policy_number]"
}
```

#### General Documents with Expiry
```typescript
{
  title: "📋 [Building] Document Review Required",
  start_time: expiry_date,
  reminder_minutes: [1440], // 1 day before
  description: "Document requires attention.\n\nType: [document_type]\nSummary: [summary]"
}
```

### Automatic Tasks

#### Contracts
```typescript
{
  title: "Review Contract – [Contractor]",
  due_date: expiry_date || (today + 14 days),
  description: "Review contract terms and conditions.\n\nContractor: [contractor]\nService: [service_type]\nValue: [value]"
}
```

#### Contractor Quotes
```typescript
{
  title: "Review Quote – [Contractor]",
  due_date: today + 7 days,
  description: "Review contractor quote and compare with others.\n\nWork: [work_description]\nAmount: [quoted_amount]"
}
```

### AI-Generated Email Drafts

#### Meeting Minutes
```typescript
{
  to: ["directors@building.com"],
  subject: "Minutes from [date] – [Building]",
  body: generateMinutesEmailDraft(analysis),
  attachments: [{ name: filename, url: public_url }]
}
```

## 🔍 OCR Pipeline (Reused from Lease Lab)

1. **Intelligent Method Selection** - Analyzes document characteristics
2. **PDF Text Layer** (fastest) - Direct text extraction
3. **OpenAI File API** - Cloud-based extraction with cleanup
4. **Google Vision OCR** - For scanned documents and images

### Supported File Types

- **PDF** (.pdf) - Primary format
- **Word** (.docx, .doc) - Office documents
- **Excel** (.xlsx, .xls) - Spreadsheets and financial data
- **Text** (.txt) - Plain text files
- **Images** (.jpg, .jpeg, .png) - Scanned documents

## ✅ User Confirmation Flow

### Upload Process

1. **File Upload** - Drag-and-drop or browse to select documents
2. **OCR Analysis** - Text extraction using intelligent method selection
3. **AI Classification** - Flexible analysis and metadata extraction
4. **User Review** - Confirmation modal with extracted data and confidence score
5. **User Decision** - Accept, override classification, or mark for manual review
6. **Automation** - Trigger appropriate Outlook integrations based on document type
7. **Audit Logging** - Complete trail of AI suggestions and user decisions

### Override Capabilities

Users can:
- **Accept AI Classification** - File document as suggested
- **Override Document Type** - Select different classification from dropdown
- **Modify Expiry Date** - Correct or add expiry dates for calendar events
- **Add Contractor Info** - Enhance metadata for contracts and quotes

### Audit Trail

All actions logged with:
- AI original suggestion
- User confirmation/override
- Final classification used
- Outlook integration IDs created
- Complete metadata extraction

## 🚀 Usage Example

```typescript
// Open upload modal
<GeneralDocumentUploadModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  buildingId="123"
  buildingName="Ashwood Tower"
  onUploadComplete={(result) => {
    console.log('Document uploaded:', result)
    // Refresh documents list
  }}
/>
```

### API Response Format

```json
{
  "success": true,
  "type": "general_document_upload",
  "document": {
    "id": "doc_789",
    "filename": "Insurance_Policy_2024.pdf",
    "public_url": "https://...",
    "file_size": 2048576,
    "storage_path": "123/general/1234567890_Insurance_Policy_2024.pdf"
  },
  "analysis": {
    "document_type": "insurance_policy",
    "document_date": "2024-01-15",
    "expiry_date": "2025-01-15",
    "parties_involved": ["ABC Insurance Ltd", "Ashwood Tower Management"],
    "keywords": ["building insurance", "liability", "renewal", "premium"],
    "summary": "Annual building insurance policy with comprehensive coverage...",
    "confidence": 94,
    "metadata": {
      "policy_number": "POL-2024-123456",
      "insurer": "ABC Insurance Ltd",
      "coverage_amount": 5000000,
      "premium": 12500
    }
  },
  "outlook_integration": {
    "calendar_event_id": "cal_456",
    "task_id": null,
    "email_draft_id": null,
    "created_at": "2024-01-15T10:30:00Z"
  },
  "next_steps": [
    "Review policy terms and coverage",
    "Set calendar reminder for renewal date",
    "Policy expires on 2025-01-15 - prepare for renewal",
    "Compare with other insurance quotes if renewal approaching"
  ]
}
```

## 🔒 Security & Validation

### File Validation
- **Size Limit**: 50MB maximum
- **Type Verification**: MIME type and extension checking
- **Authentication**: Required user session
- **Building Access**: Validates user has access to specified building

### Data Protection
- **User Isolation**: Files stored with user ID and building ID
- **RLS Policies**: Row Level Security on all database operations
- **Complete Audit Trail**: All actions logged with user attribution
- **Error Handling**: Comprehensive error catching with informative messages

## 📊 Next Steps Generation

The system provides intelligent next steps based on document type:

- **Insurance Policies**: Review terms, set renewals, compare quotes
- **Contracts**: Review terms, verify credentials, set monitoring
- **Meeting Minutes**: Review accuracy, distribute, follow up on actions
- **Quotes**: Compare options, check references, schedule visits
- **Maintenance Reports**: Prioritize repairs, obtain quotes, schedule work
- **Financial Statements**: Review variances, notify directors, plan budgets

## 🔧 Configuration

### Environment Variables
```env
OPENAI_API_KEY=sk-...                    # OpenAI API for document analysis
NEXT_PUBLIC_SUPABASE_URL=https://...     # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=...            # Service role for server operations
```

### Required Database Tables
- `building_documents` (main storage)
- `document_logs` (audit trail)
- `outlook_calendar_events` (calendar integration)
- `outlook_tasks` (task management)
- `outlook_email_drafts` (email preparation)

## 🧪 Testing

### Test Document Upload

1. Navigate to `http://localhost:3001/documents/general`
2. Select a building from dropdown
3. Click "Upload Document"
4. Drag and drop any supported document type
5. Click "Upload & Analyze"
6. Review AI classification results
7. Accept or override the classification
8. Verify Outlook integration created appropriately

### Expected Behaviors

- **Insurance Policy** → Calendar event for renewal date
- **Meeting Minutes** → Email draft to directors
- **Contract** → Review task created
- **Quote** → Comparison task created
- **Other Types** → Appropriate automation based on content

## 🔄 Integration Points

### Existing Systems
- **Lease Lab OCR** - Reuses entire text extraction pipeline
- **Supabase Storage** - Uses existing building-documents bucket
- **Authentication** - Integrates with current auth system
- **Outlook** - Leverages existing calendar/email/task integration

### Future Enhancements
- **Batch Upload** - Multiple documents simultaneously
- **Template Recognition** - Identify standard document templates
- **Smart Tagging** - ML-based keyword and category tagging
- **Workflow Automation** - Trigger complex business processes
- **Mobile Support** - React Native version for field uploads
- **API Integration** - Connect to external property management systems

## 📈 Analytics & Reporting

Track key metrics:
- Classification accuracy by document type
- User override rates and patterns
- Outlook integration usage
- Processing times by file type
- User satisfaction with AI suggestions

## 🆘 Troubleshooting

### Common Issues

1. **500 Error on Upload**
   - Check OpenAI API key validity
   - Verify Supabase bucket permissions
   - Ensure OCR modules are available

2. **Classification Confidence Low**
   - Document may be scanned poorly
   - Text extraction may be incomplete
   - Use override feature to correct

3. **Outlook Integration Fails**
   - Check database table existence
   - Verify user permissions
   - Non-critical - document still saves

### Debug Information
- All errors logged to console with stack traces
- Audit trail shows complete processing history
- User feedback collected through confirmation modal

The General Document Upload function provides a comprehensive, flexible solution for any building management document with intelligent automation and full user control.