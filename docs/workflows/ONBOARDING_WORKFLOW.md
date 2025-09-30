# Onboarding Workflow - Complete Process

## Overview

The BlocIQ onboarding workflow ensures that agencies and clients only ever see clean, validated data in production tables, while super_admins handle the complex AI-powered extraction and review process behind the scenes.

## Complete Workflow

### 1. Super Admin Upload 📤
**Location**: `/dashboard/onboarding` → Raw Uploads Panel

- **Dropzone Interface**: Drag-and-drop file upload
- **Supported Formats**: PDF, Excel, Word, TXT, CSV (up to 50MB)
- **Client Packs**: Complete building documentation sets
- **Storage**: Files saved to Supabase Storage
- **Metadata**: Saved to `onboarding_raw` table with processing status

```typescript
// Upload Process
Super Admin → Dropzone → Supabase Storage → onboarding_raw table
```

### 2. AI Classification + Extraction 🤖
**Trigger**: Automatic after upload via `/api/onboarding/extract`

- **Document Analysis**: AI classifies document type (lease, FRA, apportionment, etc.)
- **Text Extraction**: Extracts content from various file formats
- **Data Structuring**: Maps content to appropriate production tables
- **Confidence Scoring**: Provides accuracy metrics for review decisions
- **Staging Storage**: Results saved to `staging_structured` table

```typescript
// AI Processing
Raw File → AI Analysis → staging_structured table
```

**Supported Document Types**:
- Building Information → `buildings` table
- Unit Details → `units` table  
- Leaseholder Lists → `leaseholders` table
- Lease Documents → `leases` table
- Apportionment Data → `unit_apportionments` table
- Compliance Docs → `building_compliance_assets` table
- Financial Records → Various financial tables

### 3. Super Admin Review 👁️
**Location**: `/dashboard/onboarding` → Staging Review Panel

- **Pending Queue**: Shows all AI-extracted data awaiting review
- **File Preview**: Source file and detected type information
- **Extracted Fields**: Preview of structured data
- **Confidence Scores**: Visual indicators for extraction quality
- **Review Actions**:
  - ✅ **Accept** → Approves data for production
  - ✏️ **Edit** → Modifies extracted data before approval
  - ❌ **Reject** → Marks as rejected with notes

```typescript
// Review Process
AI Extracted Data → Human Review → Accept/Edit/Reject Decision
```

### 4. Production Commit 🚀
**Action**: Accept button triggers `/api/onboarding/commit`

- **Data Validation**: Ensures data integrity and required fields
- **Production Insert**: Commits accepted data to production tables
- **Status Update**: Marks staging records as committed
- **Audit Trail**: Tracks who committed what and when

```typescript
// Production Commit
Accepted Data → Validation → Production Tables → Audit Log
```

### 5. Clean Production Tables ✨
**Result**: Agencies and clients see only validated, clean data

- **No Staging Data**: Production tables contain only accepted, validated records
- **No Processing Artifacts**: No AI confidence scores or extraction metadata
- **Clean Schema**: Standard BlocIQ table structure
- **Real-time Access**: Agencies see data immediately after commit

```typescript
// Final State
Production Tables: buildings, units, leaseholders, leases, etc.
Contains: Only clean, validated, accepted data
```

## Security & Access Control

### Super Admin Access
- **Upload Rights**: Can upload and process any file type
- **Review Rights**: Can accept, edit, or reject any extraction
- **Commit Rights**: Can commit data to any production table
- **Audit Access**: Can see complete processing history

### Agency/Client Access
- **Read-Only Production**: Access only to validated production tables
- **No Staging Access**: Cannot see `onboarding_raw` or `staging_structured`
- **No Processing View**: Cannot see AI confidence scores or extraction metadata
- **Clean Interface**: Standard BlocIQ dashboard experience

## Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Super Admin   │    │   AI Processing  │    │  Production DB  │
│                 │    │                  │    │                 │
│ 1. Upload Files │───▶│ 2. Extract Data  │───▶│ 5. Clean Data  │
│ 3. Review Data  │    │ 4. Stage Results │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       ▲
         │                       │                       │
         ▼                       ▼                       │
┌─────────────────┐    ┌──────────────────┐             │
│  Staging Tables │    │  Review Queue    │             │
│                 │    │                  │             │
│ onboarding_raw  │    │ staging_         │             │
│                 │    │ structured      │             │
└─────────────────┘    └──────────────────┘             │
                                                        │
┌─────────────────┐                                    │
│   Agencies/     │                                    │
│   Clients       │────────────────────────────────────┘
│                 │
│ Read-only access│
│ to production   │
│ tables only     │
└─────────────────┘
```

## API Endpoints Used

### 1. Upload Phase
- **POST** `/api/onboarding/upload` - File upload and storage

### 2. Processing Phase  
- **POST** `/api/onboarding/extract` - AI analysis and extraction

### 3. Review Phase
- **GET** `/api/onboarding/extract?status=pending` - Fetch pending reviews
- **POST** `/api/onboarding/review` - Accept/reject/edit actions

### 4. Commit Phase
- **POST** `/api/onboarding/commit` - Commit to production tables

## Quality Assurance

### AI Confidence Scoring
- **High Confidence (≥80%)**: Green indicators, likely accurate
- **Medium Confidence (60-79%)**: Yellow indicators, review recommended  
- **Low Confidence (<60%)**: Red indicators, manual review required

### Data Validation
- **Required Fields**: Ensures all mandatory fields are present
- **Data Types**: Validates field types match table schema
- **Relationships**: Ensures foreign key relationships are valid
- **Business Rules**: Applies domain-specific validation logic

### Audit Trail
- **Upload Tracking**: Who uploaded what and when
- **Processing Log**: AI extraction results and confidence scores
- **Review History**: Who reviewed what with notes and timestamps
- **Commit Records**: What was committed to which production table

## Benefits

### For Super Admins
- **Efficient Processing**: AI handles initial extraction and classification
- **Quality Control**: Human review ensures accuracy before production
- **Bulk Operations**: Process multiple documents in organized batches
- **Audit Capability**: Complete tracking of all processing activities

### For Agencies/Clients
- **Clean Data**: Only see validated, accurate information
- **No Processing Complexity**: Standard BlocIQ interface
- **Immediate Availability**: Data appears instantly after commit
- **Trust & Reliability**: Know that all data has been reviewed and validated

### For the Platform
- **Scalability**: AI processing can handle large volumes
- **Quality**: Human oversight ensures high data quality
- **Security**: Clear separation between staging and production
- **Compliance**: Complete audit trail for regulatory requirements

## Error Handling

### Upload Errors
- File type validation and size limits
- Storage quota and network issues
- Graceful error messages with retry options

### Processing Errors
- AI service failures with fallback options
- Malformed document handling
- Processing timeout management

### Review Errors
- Data validation failures with clear error messages
- Production constraint violations
- Rollback capabilities for failed commits

### Recovery Options
- Manual reprocessing of failed extractions
- Data correction through edit functionality
- Batch reprocessing for systematic issues

## Conclusion

This workflow ensures that BlocIQ maintains the highest data quality standards while providing an efficient, scalable onboarding process. Super admins have powerful tools for processing client packs, while agencies and clients benefit from clean, reliable production data without any exposure to the complexity of the extraction process.
