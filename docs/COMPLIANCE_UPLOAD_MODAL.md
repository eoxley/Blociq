# UploadComplianceModal Component

## Overview

The `UploadComplianceModal` is a React component that provides a comprehensive solution for uploading compliance documents with AI-powered extraction and analysis. It integrates seamlessly with the BlocIQ compliance management system.

## Features

### 🎯 Core Functionality
- **Drag-and-drop file upload** for PDF, DOC, and DOCX files
- **AI-powered document analysis** using OpenAI GPT-4
- **Automatic metadata extraction** including dates, titles, and compliance issues
- **Real-time progress tracking** with visual feedback
- **BlocIQ brand styling** with consistent design language

### 📁 File Management
- **File validation** (size limit: 10MB, supported formats: PDF, DOC, DOCX)
- **Organized storage** in Supabase Storage with structured paths
- **Automatic file naming** with timestamps and sanitized names

### 🤖 AI Integration
- **Document text extraction** using pdf2json
- **Intelligent analysis** of compliance documents
- **Structured data extraction** including:
  - Document title/type
  - Summary
  - Last renewal date
  - Next due date
  - Compliance issues

## Component Props

```typescript
interface UploadComplianceModalProps {
  isOpen: boolean
  onClose: () => void
  buildingId: string
  complianceAssetId: string
  assetName: string
}
```

## Usage

### Basic Implementation

```tsx
import UploadComplianceModal from '@/components/UploadComplianceModal'

function CompliancePage() {
  const [showModal, setShowModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState(null)

  return (
    <div>
      <button onClick={() => setShowModal(true)}>
        Upload Document
      </button>
      
      <UploadComplianceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        buildingId="123"
        complianceAssetId="asset-uuid"
        assetName="Fire Risk Assessment"
      />
    </div>
  )
}
```

### Integration with Compliance Tracker

The modal is integrated into the `ComplianceTrackerClient` component:

```tsx
// In ComplianceTrackerClient.tsx
const [selectedAssetForUpload, setSelectedAssetForUpload] = useState<{
  id: string
  name: string
} | null>(null)

// Trigger upload for specific asset
<Button onClick={() => setSelectedAssetForUpload({
  id: asset.asset_id,
  name: asset.compliance_assets.name
})}>
  Upload Document
</Button>

// Modal component
{selectedAssetForUpload && (
  <UploadComplianceModal
    isOpen={!!selectedAssetForUpload}
    onClose={() => setSelectedAssetForUpload(null)}
    buildingId={complianceData.building.id}
    complianceAssetId={selectedAssetForUpload.id}
    assetName={selectedAssetForUpload.name}
  />
)}
```

## API Integration

### Extract Compliance API (`/api/extract-compliance`)

The modal communicates with a dedicated API endpoint that handles:

1. **Document processing** - Extracts text from uploaded PDFs
2. **AI analysis** - Uses OpenAI GPT-4 to analyze document content
3. **Database updates** - Saves extracted data to `compliance_documents` table
4. **Asset updates** - Updates `building_compliance_assets` with new dates

#### Request Payload
```json
{
  "fileUrl": "https://supabase.co/storage/v1/object/public/documents/...",
  "buildingId": "123",
  "complianceAssetId": "asset-uuid",
  "assetName": "Fire Risk Assessment"
}
```

#### Response
```json
{
  "success": true,
  "document": {
    "id": "doc-uuid",
    "building_id": 123,
    "compliance_asset_id": "asset-uuid",
    "document_url": "...",
    "title": "Fire Risk Assessment Report",
    "summary": "Comprehensive fire risk assessment...",
    "extracted_date": "2024-12-01T10:00:00Z"
  },
  "extracted_data": {
    "title": "Fire Risk Assessment Report",
    "summary": "Comprehensive fire risk assessment...",
    "last_renewed_date": "2024-01-15",
    "next_due_date": "2025-01-15",
    "compliance_issues": "Minor issues with emergency lighting"
  }
}
```

## Database Schema

### compliance_documents Table

```sql
CREATE TABLE compliance_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  compliance_asset_id UUID NOT NULL REFERENCES compliance_assets(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  extracted_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  doc_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Updated building_compliance_assets Table

```sql
ALTER TABLE building_compliance_assets 
ADD COLUMN latest_document_id UUID REFERENCES compliance_documents(id) ON DELETE SET NULL,
ADD COLUMN last_renewed_date DATE;
```

## Styling

The component uses BlocIQ brand colors and design patterns:

- **Primary Color**: `#2BBEB4` (teal)
- **Secondary Color**: `#0F5D5D` (dark teal)
- **Font**: Serif for headings, sans-serif for body text
- **Border Radius**: 12px (rounded-xl)
- **Shadows**: Subtle elevation with hover effects

## Error Handling

The component includes comprehensive error handling:

- **File validation errors** - Displayed as toast notifications
- **Upload failures** - Graceful fallback with retry options
- **AI processing errors** - Fallback to manual data entry
- **Network errors** - User-friendly error messages

## Accessibility

- **Keyboard navigation** - Full keyboard support
- **Screen reader support** - Proper ARIA labels
- **Focus management** - Logical tab order
- **High contrast** - Meets WCAG guidelines

## Performance Considerations

- **File size limits** - 10MB maximum to prevent performance issues
- **Progressive loading** - Visual feedback during processing
- **Optimized storage** - Efficient file organization in Supabase
- **Caching** - Intelligent caching of extracted data

## Security

- **File type validation** - Prevents malicious file uploads
- **Row Level Security** - Database-level access control
- **Authenticated access** - Requires user authentication
- **Secure storage** - Files stored in Supabase with proper permissions

## Future Enhancements

- **Batch upload** - Support for multiple files
- **OCR integration** - Better text extraction from images
- **Template matching** - Pre-defined document templates
- **Version control** - Document versioning and history
- **Export functionality** - Generate compliance reports 