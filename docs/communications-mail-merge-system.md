# Communications Hub Mail-Merge System

## Overview

The Communications Hub Mail-Merge system enables property management agencies to send personalized communications (emails, letters, and Word CSV exports) to leaseholders across their portfolio. The system supports batch operations, template management, and comprehensive logging.

## Features

### 🎯 Core Functionality
- **Batch Communications**: Send emails and generate letters for multiple recipients
- **Template Management**: Create and manage reusable communication templates
- **Mail-Merge**: Personalize content with recipient-specific data
- **Word CSV Export**: Generate CSV files for Microsoft Word Mail Merge
- **Comprehensive Logging**: Track all communication activities

### 📊 Audience Targeting
- **All Buildings**: Send to entire portfolio
- **Specific Buildings**: Target individual properties
- **Specific Units**: Target individual leaseholders

### 📧 Communication Types
- **Email Campaigns**: Bulk email sending with personalization
- **Letter Generation**: PDF letter generation with postal addressing
- **Word CSV Export**: Data export for external mail merge tools

## Architecture

### Database Schema

#### `communication_templates` Table
```sql
CREATE TABLE communication_templates (
  id UUID PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('email', 'letter')),
  subject_template TEXT,
  body_html TEXT,
  body_text TEXT,
  required_fields TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `v_building_recipients` View
Precomputed view containing all recipient data for mail-merge:
- Building and unit information
- Leaseholder contact details
- Agency information
- Merge field data

#### `communications_log` Table
Audit trail for all communication activities:
- Campaign tracking
- Delivery status
- Error logging
- Performance metrics

### API Endpoints

#### Template Management
- `GET /api/comms/templates` - List templates
- `POST /api/comms/templates` - Create template
- `PUT /api/comms/templates/[id]` - Update template
- `DELETE /api/comms/templates/[id]` - Delete template

#### Recipient Management
- `GET /api/comms/recipients` - Fetch recipient data
- `POST /api/comms/preview` - Preview merged content

#### Campaign Execution
- `POST /api/comms/generate-letters` - Generate PDF letters
- `POST /api/comms/send-emails` - Send email campaign
- `POST /api/comms/export-word-csv` - Export CSV for Word

### Merge Fields

The system supports the following merge fields:

#### Personal Information
- `{{title}}` - Mr, Mrs, Ms, Dr, etc.
- `{{first_name}}` - First name
- `{{last_name}}` - Last name
- `{{email}}` - Email address

#### Property Information
- `{{building_name}}` - Building name
- `{{unit_number}}` - Unit number
- `{{address_line_1}}` - Address line 1
- `{{address_line_2}}` - Address line 2
- `{{city}}` - City
- `{{postcode}}` - Postcode

#### Agency Information
- `{{agency_name}}` - Agency name
- `{{agency_address}}` - Agency address
- `{{agency_phone}}` - Agency phone
- `{{agency_email}}` - Agency email

#### System Fields
- `{{current_date}}` - Current date (DD/MM/YYYY)
- `{{today}}` - Current date (formatted)

## Usage Guide

### 1. Creating Templates

1. Navigate to Communications Hub
2. Click "Mail-Merge Campaign"
3. Select "Create New Template"
4. Choose template type (Email or Letter)
5. Define subject and body content using merge fields
6. Save template for future use

### 2. Running a Campaign

1. Select "Mail-Merge Campaign" from Communications Hub
2. Choose audience (All Buildings, Specific Buildings, or Specific Units)
3. Select template or create new one
4. Preview merged content
5. Execute campaign (Email, Letter, or CSV Export)

### 3. Monitoring Campaigns

1. View Communications Log for campaign status
2. Track delivery success rates
3. Monitor error messages and warnings
4. Export campaign reports

## Technical Implementation

### Merge Engine

The merge engine (`lib/comms/merge.ts`) handles:
- Template parsing and validation
- Field replacement with recipient data
- Error handling for missing fields
- Content sanitization

### Template System

Templates (`lib/comms/templates.ts`) provide:
- CRUD operations for templates
- Validation of required fields
- Agency-scoped access control

### Logging System

The logging system (`lib/comms/logs.ts`) tracks:
- Campaign creation and execution
- Individual recipient processing
- Error conditions and warnings
- Performance metrics

## Security & Compliance

### Row Level Security (RLS)
- All tables have RLS enabled
- Agency-scoped data access
- User authentication required

### Data Protection
- Personal data handling compliance
- Secure template storage
- Audit trail maintenance

### Error Handling
- Graceful failure handling
- Detailed error logging
- User-friendly error messages

## Performance Considerations

### Batch Processing
- Efficient recipient grouping
- Parallel processing where possible
- Progress tracking for large campaigns

### Database Optimization
- Indexed views for fast recipient queries
- Efficient template caching
- Optimized logging queries

### Memory Management
- Streaming for large datasets
- Pagination for large result sets
- Resource cleanup after processing

## Testing

Run the comprehensive test suite:

```bash
node scripts/test-mail-merge-system.js
```

The test suite validates:
- File structure completeness
- SQL migration validity
- TypeScript syntax
- API route structure
- React component integration
- System integration

## Deployment

### Prerequisites
- Supabase database with required tables
- Environment variables configured
- File storage bucket for PDFs

### Database Migrations
1. Run `migrations/20241207_create_communications_views.sql`
2. Run `migrations/20241207_create_communications_log.sql`

### Environment Variables
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FROM_EMAIL=noreply@yourdomain.com
```

## Troubleshooting

### Common Issues

#### Template Not Found
- Verify template exists and is agency-scoped
- Check template ID in request

#### No Recipients Found
- Verify building/unit selection
- Check recipient data in database
- Ensure RLS policies allow access

#### Merge Field Errors
- Validate merge field syntax
- Check recipient data completeness
- Review template requirements

#### Email Delivery Issues
- Verify email service configuration
- Check recipient email validity
- Review delivery logs

### Debug Mode

Enable debug logging by setting:
```env
DEBUG_COMMS=true
```

This will provide detailed logs for:
- Template processing
- Merge field resolution
- API request/response cycles
- Error conditions

## Future Enhancements

### Planned Features
- **Scheduled Campaigns**: Time-delayed campaign execution
- **A/B Testing**: Template performance comparison
- **Advanced Analytics**: Campaign performance metrics
- **Template Library**: Shared template marketplace
- **Mobile Optimization**: Mobile-friendly campaign management

### Integration Opportunities
- **CRM Integration**: Customer relationship management
- **Calendar Integration**: Event-based communications
- **Survey Tools**: Feedback collection integration
- **Social Media**: Multi-channel communication

## Support

For technical support or feature requests:
- Check the troubleshooting section
- Review system logs
- Contact the development team
- Submit issues via the project repository
