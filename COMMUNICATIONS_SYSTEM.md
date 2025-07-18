# BlocIQ Communications System

## Overview

The BlocIQ Communications System is a comprehensive template-based document generation platform that allows property managers to create professional letters, notices, forms, and invoices using customizable templates with dynamic placeholder replacement.

## Features

### 🎯 **Core Functionality**
- **Template Management**: Upload, organize, and manage .docx templates
- **Dynamic Generation**: Replace placeholders with real data
- **Document History**: Track all generated documents
- **Building Integration**: Link documents to specific properties
- **Search & Filter**: Find templates and documents quickly

### 📄 **Document Types**
- **Welcome Letters**: Personalized introductions for new leaseholders
- **Notices**: Formal communications for maintenance, rent changes, compliance
- **Forms**: Standardized applications, requests, and surveys
- **Invoices**: Service charge and payment documentation

## System Architecture

### Frontend Routes
```
/communications                    # Main communications hub
/communications/templates          # Template listing and management
/communications/templates/[id]     # Template generation form
/communications/log               # Generated documents history
```

### Backend API
```
POST /api/generate-doc            # Generate document from template
```

### Database Schema

#### `templates` Table
```sql
- id (UUID, Primary Key)
- name (VARCHAR) - Template display name
- type (VARCHAR) - welcome_letter, notice, form, invoice
- description (TEXT) - Template description
- storage_path (VARCHAR) - Path to .docx file in storage
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `generated_documents` Table
```sql
- id (UUID, Primary Key)
- template_id (UUID, Foreign Key) - References templates.id
- building_id (UUID, Foreign Key) - References buildings.id
- filled_by (VARCHAR) - User who generated the document
- filepath (VARCHAR) - Path to generated file in storage
- created_at (TIMESTAMP)
```

### Storage Buckets
- **`templates/`**: Original .docx template files
- **`generated/`**: Generated documents with filled placeholders

## Usage Guide

### 1. Template Management

#### Uploading Templates
1. Navigate to `/communications/templates`
2. Click "Upload Template"
3. Select a .docx file (max 10MB)
4. Fill in template details:
   - Name
   - Type (Welcome Letter, Notice, Form, Invoice)
   - Description
5. Click "Upload Template"

#### Template Guidelines
- Use .docx format only
- Include placeholders like `{{building_name}}`, `{{leaseholder_name}}`
- Keep file size under 10MB
- Test templates before uploading

### 2. Document Generation

#### Using Templates
1. Browse templates at `/communications/templates`
2. Click "Generate Document" on desired template
3. Fill in the dynamic form fields:
   - Building selection
   - Property manager details
   - Leaseholder information
   - Financial amounts
   - Contact details
4. Click "Generate Document"
5. Download the generated file

#### Available Placeholders
```javascript
{
  building_name: "Ashwood House",
  property_manager_name: "John Smith",
  today_date: "15/01/2024",
  leaseholder_name: "Sarah Johnson",
  unit_number: "Flat 3B",
  service_charge_amount: "£1,200.00",
  notice_period: "30 days",
  contact_email: "manager@blociq.co.uk",
  contact_phone: "020 1234 5678"
}
```

### 3. Document History

#### Viewing Generated Documents
1. Navigate to `/communications/log`
2. View all generated documents with:
   - Template name and type
   - Building association
   - Generation date
   - Download links
3. Use search and filters to find specific documents

## Technical Implementation

### Document Processing

#### Placeholder Replacement
```typescript
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export async function replacePlaceholdersInDocx(
  buffer: Blob, 
  data: Record<string, string>
): Promise<Blob> {
  const arrayBuffer = await buffer.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true
  });
  
  doc.setData(data);
  doc.render();
  
  const output = doc.getZip().generate({ type: 'uint8array' });
  return new Blob([output], { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
}
```

#### API Endpoint
```typescript
POST /api/generate-doc
{
  templateId: "uuid",
  buildingId: "uuid", // optional
  placeholderData: {
    building_name: "Ashwood House",
    leaseholder_name: "Sarah Johnson",
    // ... other placeholders
  }
}

Response:
{
  success: true,
  fileUrl: "https://...",
  filename: "welcome_letter_2024-01-15.docx",
  templateName: "Welcome Letter Template"
}
```

### Security Features

#### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Proper authentication required for all operations

#### File Validation
- File type validation (.docx only)
- File size limits (10MB max)
- Secure file storage with access controls

### Error Handling
- Comprehensive error messages
- Graceful fallbacks for missing data
- Validation for required fields
- File processing error recovery

## Sample Templates

### Welcome Letter Template
```
Dear {{leaseholder_name}},

Welcome to {{building_name}}! We're delighted to have you as a new leaseholder.

Your unit: {{unit_number}}
Property Manager: {{property_manager_name}}

For any questions, please contact us:
Email: {{contact_email}}
Phone: {{contact_phone}}

Best regards,
The {{building_name}} Management Team
{{today_date}}
```

### Service Charge Notice
```
NOTICE OF SERVICE CHARGE CHANGE

To: {{leaseholder_name}}
Unit: {{unit_number}}
Building: {{building_name}}

This notice is to inform you of changes to your service charge...

Amount: {{service_charge_amount}}
Effective Date: {{today_date}}
Notice Period: {{notice_period}}

Contact: {{property_manager_name}}
{{contact_email}}
{{contact_phone}}
```

## Database Setup

### Run the SQL Script
Execute `scripts/createCommunicationsTables.sql` in your Supabase SQL editor to:
- Create required tables
- Set up indexes for performance
- Enable RLS policies
- Insert sample templates

### Storage Buckets
Create the following storage buckets in Supabase:
- `templates` (for original .docx files)
- `generated` (for processed documents)

## Integration Points

### With Existing Systems
- **Buildings**: Link documents to specific properties
- **Users**: Track who generated documents
- **Navigation**: Integrated into main app navigation
- **Theming**: Consistent with BlocIQ design system

### Future Enhancements
- Email integration for sending documents
- Bulk document generation
- Template versioning
- Advanced placeholder types (dates, calculations)
- Document preview functionality
- Template sharing between users

## Troubleshooting

### Common Issues

#### Template Upload Fails
- Check file format (.docx only)
- Verify file size (under 10MB)
- Ensure all required fields are filled

#### Document Generation Fails
- Verify template has valid placeholders
- Check that all required data is provided
- Ensure template file exists in storage

#### Placeholder Not Replaced
- Check placeholder syntax: `{{placeholder_name}}`
- Verify placeholder name matches form field
- Ensure no extra spaces in placeholder names

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` to see detailed error messages.

## Performance Considerations

### Optimization Tips
- Use appropriate indexes on database tables
- Implement file size limits
- Cache frequently used templates
- Optimize placeholder replacement for large documents

### Monitoring
- Track template usage statistics
- Monitor storage usage
- Log generation errors for debugging
- Monitor API response times

## Security Best Practices

### Data Protection
- Validate all user inputs
- Sanitize placeholder data
- Implement proper access controls
- Regular security audits

### File Security
- Validate file uploads
- Scan for malicious content
- Implement file access controls
- Regular backup procedures 