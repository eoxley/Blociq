# Ask BlocIQ Reporting System

A comprehensive natural language reporting system that allows users to generate compliance and general database reports through conversational AI.

## Overview

The Ask BlocIQ Reporting System enables users to request reports using natural language, such as:
- "Show me a compliance report for Ashwood House this quarter"
- "Generate an overdue compliance summary"
- "List all EICR documents for the portfolio"
- "Export insurance documents to CSV"

## Architecture

### Core Components

1. **Intent Detection** (`ai/intent/report.ts`)
   - Detects report-related phrases in user input
   - Extracts subject, scope, period, and format information
   - Returns structured intent data with confidence scores

2. **Report Registry** (`ai/reports/registry.ts`)
   - Maps report subjects to specific handlers
   - Manages report handler registration and discovery
   - Provides validation and metadata for reports

3. **Report Engine** (`ai/reports/engine.ts`)
   - Executes report queries based on intent
   - Manages database connections and RLS enforcement
   - Handles building/unit context resolution

4. **Report Handlers** (`ai/reports/handlers.ts`)
   - Implements specific report generation logic
   - Handles compliance, documents, and email reports
   - Formats data for different output types

5. **Formatters** (`ai/reports/format.ts`)
   - Converts report data to table, CSV, and PDF formats
   - Handles file storage and signed URL generation
   - Provides download actions for reports

6. **Period Parsing** (`lib/dates/period.ts`)
   - Parses natural language period expressions
   - Converts to ISO date ranges
   - Supports various period formats (today, this week, YTD, etc.)

### Database Views

The system uses optimized SQL views for fast, RLS-safe queries:

- `building_compliance_status_v` - Current compliance status for all assets
- `compliance_overdue_v` - Assets that are overdue for inspection
- `compliance_upcoming_v` - Assets due in the next 90 days
- `buildings_min_v` - Minimal building information
- `units_min_v` - Minimal unit information
- `document_types_summary_v` - Summary of document types per building
- `compliance_by_type_v` - Compliance status grouped by asset type

## Usage

### Natural Language Queries

Users can request reports using natural language:

```
"Compliance overview for Ashwood House this quarter"
"Show overdue across the portfolio"
"Latest insurance docs for every building, export to CSV"
"List EICs due in the next 90 days for HRB buildings only"
```

### Supported Report Types

#### Compliance Reports
- **Overview**: Complete compliance status for buildings/portfolio
- **Overdue**: Assets that are overdue for inspection or renewal
- **Upcoming**: Assets due in the next 90 days
- **By Type**: Compliance status for specific asset types (EICR, FRA, EWS1, etc.)

#### Document Reports
- **Latest By Type**: Most recent documents of a specific type
- **All For Building**: All documents for a specific building

#### Email Reports
- **Inbox Overview**: Overview of inbox emails and communications (stub implementation)

### Supported Periods

- `today` - Current day
- `yesterday` - Previous day
- `this week` - Current week (Monday to Sunday)
- `last week` - Previous week
- `this month` - Current month
- `last month` - Previous month
- `this quarter` - Current quarter
- `last quarter` - Previous quarter
- `ytd` - Year to date
- `from DD/MM/YYYY to DD/MM/YYYY` - Custom date range
- `since DD/MM/YYYY` - From specific date

### Supported Formats

- **Table** - Formatted table for UI display (default)
- **CSV** - Comma-separated values for download
- **PDF** - Portable document format (stub implementation)

## API Integration

The reporting system is integrated into the Ask-AI endpoint (`/api/ask-ai`):

1. User sends a message to Ask-AI
2. System detects if it's a report request
3. If yes, processes the report intent
4. Executes the appropriate report handler
5. Formats the response based on requested format
6. Returns structured report data

### Response Format

```json
{
  "success": true,
  "answer": "**Compliance Overview — Ashwood House**\n\nFound 5 records...",
  "confidence": 95,
  "route": "report_generation",
  "result": {
    "type": "report",
    "title": "Compliance Overview — Ashwood House",
    "period": "01/07/2025–30/09/2025",
    "table": {
      "columns": ["Building", "Asset", "Status", "Next Due"],
      "rows": [...],
      "pagination": {...}
    },
    "actions": [
      {
        "kind": "download",
        "label": "Download CSV",
        "url": "/api/reports/report-id/download?format=csv"
      }
    ]
  }
}
```

## Security & RLS

- All database queries enforce Row Level Security (RLS)
- Agency-based filtering ensures users only see their own data
- Signed URLs for file downloads with short expiration times
- No raw storage paths exposed to clients

## Testing

### Validation Script
```bash
npm run validate:reporting
```

### Test Script
```bash
npm run test:reporting
```

### Manual Testing

1. **Intent Detection**:
   ```bash
   node scripts/test-reporting-system.js
   ```

2. **Period Parsing**:
   ```bash
   node scripts/test-reporting-system.js
   ```

3. **CSV Formatting**:
   ```bash
   node scripts/test-reporting-system.js
   ```

## Deployment

### Database Migration

1. Run the SQL migration:
   ```sql
   -- Execute migrations/20241207_create_reporting_views.sql
   ```

2. Verify views are created:
   ```sql
   SELECT * FROM information_schema.views 
   WHERE table_name LIKE '%_v' AND table_schema = 'public';
   ```

### Application Deployment

1. Ensure all files are deployed
2. Test the reporting system with real data
3. Verify RLS is working correctly
4. Test CSV downloads and file storage

## Configuration

### Environment Variables

No additional environment variables are required. The system uses existing Supabase and OpenAI configurations.

### Customization

#### Adding New Report Types

1. Create a new handler in `ai/reports/handlers.ts`
2. Register it in the `registerAllHandlers()` function
3. Add corresponding SQL views if needed
4. Update intent detection patterns if required

#### Adding New Period Formats

1. Add new patterns to `lib/dates/period.ts`
2. Update the `parsePeriod()` function
3. Add test cases to the validation script

#### Adding New Output Formats

1. Implement formatter in `ai/reports/format.ts`
2. Update the `formatReportResponse()` function
3. Add download action generation

## Troubleshooting

### Common Issues

1. **Report not detected**: Check intent detection patterns in `ai/intent/report.ts`
2. **Database errors**: Verify SQL views are created and RLS is configured
3. **CSV download fails**: Check Supabase Storage configuration and permissions
4. **Period parsing errors**: Verify date format patterns in `lib/dates/period.ts`

### Debug Mode

Enable debug logging by setting:
```javascript
console.log('Report intent detected:', reportIntent);
console.log('Report result:', reportResult);
```

## Future Enhancements

1. **PDF Generation**: Implement full PDF report generation
2. **Email Integration**: Add email report sending capability
3. **Scheduled Reports**: Allow users to schedule recurring reports
4. **Chart Generation**: Add visual charts and graphs to reports
5. **Advanced Filtering**: More sophisticated filtering options
6. **Report Templates**: Pre-defined report templates for common use cases

## Support

For issues or questions about the reporting system:

1. Check the validation script output
2. Review the test script results
3. Check the application logs for errors
4. Verify database connectivity and RLS configuration

## License

This reporting system is part of the BlocIQ application and follows the same licensing terms.
