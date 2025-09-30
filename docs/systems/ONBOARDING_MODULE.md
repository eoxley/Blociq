# Internal-Only Onboarding Module

## Overview

The Internal-Only Onboarding Module is a sophisticated AI-powered system designed to streamline the process of importing building and lease data into BlocIQ. This module allows super_admins to upload raw documents, automatically extract structured data using AI, and review/commit the extracted data to production tables.

## Architecture

### Database Schema

#### Core Tables

1. **`onboarding_raw`** - Raw file uploads and metadata
   - Stores uploaded files with processing status
   - Tracks AI detection results and confidence scores
   - Links to batches for organized processing

2. **`staging_structured`** - AI-extracted structured data
   - Contains extracted data in JSONB format
   - Manages review workflow (pending → accepted/rejected)
   - Tracks production commits

3. **`onboarding_batches`** - Batch management
   - Groups related uploads for organized processing
   - Tracks batch-level statistics and progress

### Security Model

- **Super Admin Only**: All functionality restricted to users with `role = 'super_admin'`
- **Row Level Security**: RLS policies enforce super_admin access control
- **File Storage**: Secure Supabase Storage with access controls

## API Endpoints

### File Upload
- **POST** `/api/onboarding/upload`
  - Upload raw files (PDF, Excel, Word, TXT, CSV)
  - File size limit: 50MB
  - Automatic AI processing trigger
  - Returns upload confirmation and file metadata

- **GET** `/api/onboarding/upload`
  - List uploaded files with filtering options
  - Supports batch filtering and status filtering

### AI Extraction
- **POST** `/api/onboarding/extract`
  - Trigger AI extraction for uploaded files
  - Analyzes document type and extracts structured data
  - Saves results to staging_structured table

- **GET** `/api/onboarding/extract`
  - List extracted structured records
  - Filter by status, suggested table, or raw file

### Review & Commit
- **POST** `/api/onboarding/review`
  - Accept/reject/edit extracted data
  - Accept action commits data to production tables
  - Tracks reviewer and review notes

- **GET** `/api/onboarding/review`
  - List records pending review
  - Includes file metadata and extraction details

### Batch Management
- **POST** `/api/onboarding/batches`
  - Create new onboarding batches
  - Organize related uploads

- **GET** `/api/onboarding/batches`
  - List batches with optional statistics
  - Filter by status and agency

- **PUT** `/api/onboarding/batches`
  - Update batch details and status

- **DELETE** `/api/onboarding/batches`
  - Delete empty batches (with safety checks)

## User Interface

### Super Admin Dashboard
**Location**: `/dashboard/onboarding`

#### Features
1. **Raw Uploads Panel**
   - List of uploaded files with processing status
   - File type detection and confidence scores
   - Upload interface with drag-and-drop
   - File size and type validation

2. **Staging Review Panel**
   - Table of AI-extracted data awaiting review
   - File preview and suggested table mapping
   - Accept ✅ → commits to production
   - Edit ✏️ → modal with form for data modification
   - Reject ❌ → marks as rejected with notes
   - Confidence scoring with color-coded indicators

## AI Processing Pipeline

### Document Analysis
1. **File Type Detection**: Determines document category
2. **Text Extraction**: Extracts text content from various formats
3. **AI Analysis**: Uses GPT-4o-mini to analyze content and structure
4. **Data Extraction**: Identifies target table and extracts structured data
5. **Confidence Scoring**: Provides confidence metrics for extraction quality

### Supported Document Types
- **Leases**: Extract lease terms, ground rent, restrictions
- **Building Information**: Property details, addresses, specifications
- **Unit Details**: Unit numbers, types, apportionments
- **Leaseholder Lists**: Contact information, ownership details
- **Compliance Documents**: Certificates, inspection reports
- **Financial Records**: Service charges, budgets, apportionments

### Target Production Tables
- `buildings` - Building information
- `units` - Unit details and specifications
- `leaseholders` - Leaseholder contact information
- `leases` - Lease terms and conditions
- `unit_apportionments` - Service charge percentages
- `building_compliance_assets` - Compliance tracking
- `building_documents` - Document library
- `clients` - Client information (RMC, freeholders)
- `rmc_directors` - Director appointments

## Workflow Process

### 1. File Upload
```
Super Admin → Upload File → Supabase Storage → onboarding_raw table
```

### 2. AI Processing
```
Raw File → Text Extraction → AI Analysis → staging_structured table
```

### 3. Review Process
```
Pending Review → Super Admin Review → Accept/Reject/Edit → Status Update
```

### 4. Production Commit
```
Accepted Data → Validation → Production Table Insert → Commit Tracking
```

## Error Handling

### Upload Errors
- File type validation
- Size limit enforcement
- Storage quota checks
- Network timeout handling

### Processing Errors
- AI service failures
- Text extraction issues
- Malformed document handling
- Graceful degradation

### Review Errors
- Data validation failures
- Production table constraints
- Rollback mechanisms
- Audit trail maintenance

## Monitoring & Analytics

### Statistics Tracking
- Total files uploaded
- Processing success rates
- Review completion times
- Production commit rates

### Performance Metrics
- AI processing times
- File upload speeds
- Review queue lengths
- Batch completion rates

## Security Considerations

### Access Control
- Super admin role verification
- RLS policy enforcement
- API endpoint protection
- File access restrictions

### Data Protection
- Secure file storage
- Encrypted data transmission
- Audit logging
- GDPR compliance

## Future Enhancements

### Planned Features
1. **Advanced AI Models**: Specialized models for different document types
2. **Bulk Operations**: Batch accept/reject functionality
3. **Template System**: Custom extraction templates
4. **Integration APIs**: External system connections
5. **Advanced Analytics**: Detailed reporting and insights

### Technical Improvements
1. **Async Processing**: Background job queues
2. **Caching Layer**: Performance optimization
3. **File Compression**: Storage optimization
4. **API Rate Limiting**: Usage controls
5. **Monitoring Dashboard**: Real-time metrics

## Usage Examples

### Creating a New Batch
```typescript
const response = await fetch('/api/onboarding/batches', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    batchName: 'Building ABC Onboarding',
    buildingName: '123 Main Street'
  })
});
```

### Uploading Files
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('batchId', batchId);

const response = await fetch('/api/onboarding/upload', {
  method: 'POST',
  body: formData
});
```

### Reviewing Extractions
```typescript
const response = await fetch('/api/onboarding/review', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    structuredId: 'uuid',
    action: 'accept',
    reviewNotes: 'Data looks accurate'
  })
});
```

## Troubleshooting

### Common Issues
1. **Upload Failures**: Check file type and size limits
2. **Processing Errors**: Verify AI service configuration
3. **Review Issues**: Ensure proper data validation
4. **Commit Failures**: Check production table constraints

### Support
- Check application logs for detailed error messages
- Verify super admin permissions
- Ensure proper database connectivity
- Contact system administrator for persistent issues

## Conclusion

The Internal-Only Onboarding Module provides a comprehensive, secure, and efficient solution for importing building data into BlocIQ. With AI-powered extraction, thorough review processes, and robust error handling, it streamlines the onboarding process while maintaining data quality and security standards.
