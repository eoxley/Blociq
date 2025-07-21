# SmartUploader Component

A comprehensive, reusable drag-and-drop document uploader component for BlocIQ with full BlocIQ branding, AI classification, and Supabase integration.

## Features

- 🎯 **Drag & Drop**: Intuitive drag-and-drop interface
- 📁 **Multiple Upload Methods**: Click to browse or drag files
- 🏗️ **Building Integration**: Automatic building association
- 🤖 **AI Classification**: Automatic document classification and text extraction
- 📊 **Progress Tracking**: Real-time upload progress
- 🎨 **BlocIQ Branding**: Consistent design system
- 🔒 **File Validation**: Size and type validation
- 📱 **Responsive Design**: Works on all devices
- 🔄 **Real-time Updates**: Live status updates
- 📋 **Preview Mode**: Show uploaded files with metadata

## Installation

The component is already included in the BlocIQ project. No additional installation required.

## Basic Usage

```tsx
import SmartUploader from "@/components/SmartUploader";

function MyComponent() {
  const handleUploadComplete = (document) => {
    console.log("Upload completed:", document);
  };

  const handleUploadError = (error) => {
    console.error("Upload error:", error);
  };

  return (
    <SmartUploader
      buildingId="building-123"
      documentType="building"
      onUploadComplete={handleUploadComplete}
      onUploadError={handleUploadError}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `buildingId` | `string` | `undefined` | Building ID to associate documents with |
| `documentType` | `'building' \| 'compliance' \| 'general'` | `'general'` | Type of documents being uploaded |
| `onUploadComplete` | `(document: any) => void` | `undefined` | Callback when upload completes |
| `onUploadError` | `(error: string) => void` | `undefined` | Callback when upload fails |
| `className` | `string` | `""` | Additional CSS classes |
| `multiple` | `boolean` | `false` | Allow multiple file selection |
| `acceptedFileTypes` | `string[]` | `['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png']` | Allowed file extensions |
| `maxFileSize` | `number` | `10` | Maximum file size in MB |
| `showPreview` | `boolean` | `true` | Show uploaded files preview |
| `autoClassify` | `boolean` | `true` | Enable AI classification |
| `customStoragePath` | `string` | `undefined` | Custom storage path override |

## Usage Examples

### Building Documents Upload

```tsx
<SmartUploader
  buildingId="building-123"
  documentType="building"
  onUploadComplete={(doc) => console.log("Building doc uploaded:", doc)}
  multiple={true}
  acceptedFileTypes={['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']}
  maxFileSize={20}
/>
```

### Compliance Documents Upload

```tsx
<SmartUploader
  buildingId="building-123"
  documentType="compliance"
  onUploadComplete={(doc) => console.log("Compliance doc uploaded:", doc)}
  multiple={false}
  acceptedFileTypes={['.pdf', '.doc', '.docx']}
  maxFileSize={15}
  autoClassify={true}
/>
```

### AI Assistant Document Upload

```tsx
<SmartUploader
  documentType="general"
  onUploadComplete={(doc) => console.log("AI doc uploaded:", doc)}
  multiple={true}
  acceptedFileTypes={['.pdf', '.doc', '.docx', '.txt']}
  maxFileSize={25}
  autoClassify={true}
  customStoragePath="ai-assistant"
/>
```

### Inbox Document Upload

```tsx
<SmartUploader
  documentType="general"
  onUploadComplete={(doc) => console.log("Inbox doc uploaded:", doc)}
  multiple={true}
  showPreview={false}
  autoClassify={true}
  customStoragePath="inbox"
/>
```

## Uploaded File Object

The `onUploadComplete` callback receives a file object with the following structure:

```typescript
interface UploadedFile {
  id: string;                    // Database record ID
  name: string;                  // Original file name
  size: number;                  // File size in bytes
  type: string;                  // MIME type
  url: string;                   // Public download URL
  path: string;                  // Storage path
  uploaded_at: string;           // Upload timestamp
  classification?: string;       // AI classification result
  extracted_text?: string;       // Extracted text content
  metadata?: any;                // Additional metadata
}
```

## File Storage Structure

Documents are stored in Supabase storage with the following structure:

```
documents/
├── building/
│   └── {buildingId}/
│       ├── {timestamp}_{filename}.pdf
│       └── {timestamp}_{filename}.docx
├── compliance/
│   └── {buildingId}/
│       └── {timestamp}_{filename}.pdf
├── general/
│   └── {timestamp}_{filename}.pdf
└── {customPath}/
    └── {timestamp}_{filename}.pdf
```

## Database Tables

The component automatically saves metadata to the appropriate table:

- **building_documents**: For building-related documents
- **compliance_documents**: For compliance documents
- **general_documents**: For general documents

## AI Integration

When `autoClassify` is enabled, the component:

1. Uploads the file to Supabase storage
2. Saves metadata to the database
3. Calls `/api/classify-document` for AI processing
4. Updates the database with classification results
5. Shows classification in the UI

## Error Handling

The component handles various error scenarios:

- **File size exceeded**: Shows error message with size limit
- **Invalid file type**: Shows supported file types
- **Upload failure**: Shows specific upload error
- **AI processing failure**: Continues without AI (graceful degradation)
- **Authentication error**: Shows authentication required message

## Styling

The component uses BlocIQ design system:

- **Colors**: BlocIQ brand colors and gradients
- **Typography**: Consistent font weights and sizes
- **Spacing**: Standard padding and margins
- **Shadows**: Subtle shadows for depth
- **Borders**: Rounded corners and consistent borders

## Accessibility

- **Keyboard navigation**: Full keyboard support
- **Screen readers**: Proper ARIA labels
- **Focus management**: Clear focus indicators
- **Error announcements**: Screen reader friendly error messages

## Performance

- **Lazy loading**: Only loads when needed
- **Progress tracking**: Real-time upload progress
- **Memory efficient**: Proper cleanup of file references
- **Optimized rendering**: Minimal re-renders

## Browser Support

- **Modern browsers**: Chrome, Firefox, Safari, Edge
- **File API**: Drag and drop support
- **ES6+**: Modern JavaScript features
- **CSS Grid/Flexbox**: Modern layout

## Troubleshooting

### Common Issues

1. **Upload fails**: Check file size and type restrictions
2. **AI classification not working**: Verify API endpoint is available
3. **Building association fails**: Ensure buildingId is valid
4. **Storage quota exceeded**: Check Supabase storage limits

### Debug Mode

Enable debug logging by setting:

```tsx
<SmartUploader
  debug={true}
  // ... other props
/>
```

## Contributing

When modifying the SmartUploader component:

1. Maintain TypeScript interfaces
2. Follow BlocIQ design system
3. Add proper error handling
4. Update documentation
5. Test with different file types and sizes

## Related Components

- `BlocIQButton`: Used for action buttons
- `BlocIQBadge`: Used for status indicators
- `BlocIQCard`: Used for container styling
- `toast`: Used for notifications

## API Endpoints

The component integrates with these API endpoints:

- `POST /api/classify-document`: AI document classification
- `POST /api/extract-text`: Text extraction from documents
- `GET /api/documents`: Fetch uploaded documents 