# AI Extraction Handler

## Overview

The AI Extraction Handler is a sophisticated component of the onboarding module that processes uploaded documents from `onboarding_raw` and creates structured draft rows in `staging_structured`. It uses OpenAI's GPT-4o-mini model to intelligently classify documents and extract relevant data according to UK property management standards.

## API Endpoint

### POST `/api/onboarding/extract`

**Input**: `raw_id` (points to onboarding_raw row)

**Process**:
1. Fetch file from Supabase storage
2. Send file (or text/OCR content) to AI classifier
3. Determine `suggested_table` (e.g. leases, building_compliance_assets, unit_apportionments)
4. Parse key metadata into JSON
5. Insert into `staging_structured` with `status = 'pending'`

## Document Classification Examples

### 1. Lease PDF
**Input**: Lease document (PDF)
**Output**:
```json
{
  "suggested_table": "leases",
  "data": {
    "unit_number": "Flat 2A",
    "lease_type": "residential",
    "start_date": "2023-01-01",
    "end_date": "2250-01-01",
    "ground_rent": 250,
    "service_charge_percentage": 1.25,
    "restrictions": "No pets, no subletting",
    "permitted_use": "residential only"
  },
  "confidence": 0.95
}
```

### 2. Fire Risk Assessment (FRA)
**Input**: FRA document (PDF)
**Output**:
```json
{
  "suggested_table": "building_compliance_assets",
  "data": {
    "asset_name": "Fire Risk Assessment",
    "description": "Annual FRA for building safety",
    "last_serviced_date": "2023-01-12",
    "next_service_date": "2024-01-12",
    "status": "current",
    "issues": ["Fire doors wedged", "Missing signage"],
    "contractor_name": "ABC Fire Safety Ltd"
  },
  "confidence": 0.88
}
```

### 3. Apportionment Spreadsheet
**Input**: Apportionment.xlsx
**Output**:
```json
{
  "suggested_table": "unit_apportionments",
  "data": [
    { "unit_number": "Flat A1", "percentage": 1.25 },
    { "unit_number": "Flat A2", "percentage": 1.306 },
    { "unit_number": "Flat B1", "percentage": 1.15 }
  ],
  "confidence": 0.92
}
```

### 4. Service Charge Demands
**Input**: Demands.xlsx
**Output**:
```json
{
  "suggested_table": "ar_demand_headers",
  "data": [
    { "unit_number": "Flat A1", "current_charge": 5178.75, "arrears_balance": 21693.05 },
    { "unit_number": "Flat A2", "current_charge": 5405.50, "arrears_balance": 0 }
  ],
  "confidence": 0.90
}
```

### 5. Annual Budget/Accounts
**Input**: Budget/Accounts PDF
**Output**:
```json
{
  "suggested_table": "budgets",
  "data": {
    "year": "2025",
    "total_income": 541369,
    "total_expenditure": 542486,
    "categories": {
      "lifts": 10265,
      "gardening": 5297,
      "insurance": 107967,
      "management": 25000
    }
  },
  "confidence": 0.87
}
```

## Supported Document Types

### Legal Documents
- **Lease Agreements** → `leases` table
- **Deeds of Variation** → `leases` table
- **Assignment Documents** → `leaseholders` table

### Compliance Documents
- **Fire Risk Assessments** → `building_compliance_assets`
- **Electrical Certificates** → `building_compliance_assets`
- **Gas Safety Certificates** → `building_compliance_assets`
- **Lift Certificates** → `building_compliance_assets`
- **Insurance Certificates** → `building_compliance_assets`

### Financial Documents
- **Service Charge Demands** → `ar_demand_headers`
- **Apportionment Schedules** → `unit_apportionments`
- **Annual Budgets** → `budgets`
- **Service Charge Accounts** → `budgets`
- **Arrears Reports** → `ar_demand_headers`

### Property Information
- **Building Information** → `buildings` table
- **Unit Details** → `units` table
- **Leaseholder Lists** → `leaseholders` table

## AI Classification Logic

### Document Type Detection
The AI analyzes:
- **Filename patterns** (lease, FRA, apportionment, budget, etc.)
- **Document content** (when text extraction is available)
- **File structure** (PDF, Excel, Word, CSV)
- **UK property management terminology**

### Confidence Scoring
- **High Confidence (≥80%)**: Clear document type with structured data
- **Medium Confidence (60-79%)**: Probable document type with some uncertainty
- **Low Confidence (<60%)**: Unclear document type requiring manual review

### Data Extraction Rules
1. **Required Fields**: Ensure all mandatory fields are present
2. **Data Types**: Convert strings to appropriate types (numbers, dates, booleans)
3. **UK Standards**: Use UK property management terminology and formats
4. **Validation**: Check data consistency and business rules

## Text Extraction Strategy

### PDF Documents
Currently uses filename analysis and document type hints:
```
PDF Document: lease_flat_2a.pdf

This is a PDF document that requires text extraction. The filename suggests it may contain:
- Lease information (if filename contains "lease")
- Fire Risk Assessment (if filename contains "FRA" or "fire")
- Building information (if filename contains "building")
- Financial data (if filename contains "budget", "account", "demand")
```

### Spreadsheet Documents
Analyzes filename patterns and provides structured hints:
```
Spreadsheet Document: apportionment_2025.xlsx

This is an Excel/CSV spreadsheet. Based on the filename, it likely contains:
- Apportionment data (if filename contains "apportionment", "percentage")
- Service charge demands (if filename contains "demand", "charge", "arrears")
- Budget information (if filename contains "budget", "account")
- Unit information (if filename contains "unit", "flat")
```

### Text Documents
Direct content extraction:
```
Text Document: building_info.txt

[Actual document content extracted and analyzed]
```

## Database Integration

### Supabase Insert
```typescript
await supabase.from('staging_structured').insert({
  raw_id,
  suggested_table: 'leases',
  data: json,
  confidence: 0.8,
  status: 'pending'
});
```

### Status Tracking
- **Processing**: File is being analyzed by AI
- **Completed**: AI extraction completed successfully
- **Failed**: AI extraction failed with error details

### Error Handling
- **File Access Errors**: Cannot read uploaded file
- **AI Processing Errors**: AI service unavailable or response invalid
- **Data Validation Errors**: Extracted data doesn't match expected schema
- **Database Errors**: Cannot save to staging_structured table

## Security & Access Control

### Authentication
- **Super Admin Only**: All extraction endpoints require super_admin role
- **Session Validation**: Valid user session required
- **API Key Security**: OpenAI API key secured in environment variables

### Data Privacy
- **File Access**: Only authorized super_admins can access uploaded files
- **AI Processing**: Documents sent to OpenAI for analysis (review data handling policies)
- **Staging Isolation**: Extracted data remains in staging until approved

## Performance Considerations

### Processing Limits
- **File Size**: Maximum 50MB per file
- **Text Length**: Limited to first 4000 characters for AI analysis
- **Timeout**: 30-second timeout for AI processing
- **Rate Limiting**: Respect OpenAI API rate limits

### Optimization
- **Caching**: Cache AI responses for similar documents
- **Batch Processing**: Process multiple files in parallel
- **Async Processing**: Non-blocking AI analysis
- **Error Recovery**: Retry failed extractions with backoff

## Future Enhancements

### Planned Features
1. **Advanced OCR**: Direct PDF text extraction
2. **Excel Parsing**: Native spreadsheet data extraction
3. **Document Templates**: Custom extraction templates per agency
4. **Machine Learning**: Improve classification accuracy over time
5. **Multi-language**: Support for non-English documents

### Technical Improvements
1. **Better Text Extraction**: Implement proper PDF/Excel parsing libraries
2. **Enhanced AI Models**: Use specialized models for different document types
3. **Validation Rules**: More sophisticated data validation
4. **Performance Monitoring**: Track extraction accuracy and performance
5. **A/B Testing**: Compare different AI prompts and approaches

## Usage Examples

### Basic Extraction
```typescript
const response = await fetch('/api/onboarding/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rawId: 'uuid-here' })
});

const result = await response.json();
// result.data contains extracted structured data
```

### Batch Processing
```typescript
// Process multiple files
const files = ['file1-id', 'file2-id', 'file3-id'];
for (const fileId of files) {
  await fetch('/api/onboarding/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawId: fileId })
  });
}
```

## Troubleshooting

### Common Issues
1. **Low Confidence Scores**: Review document quality and filename clarity
2. **Incorrect Classification**: Check filename patterns and document content
3. **Missing Data**: Verify document contains expected information
4. **Processing Failures**: Check file accessibility and AI service status

### Debug Information
- **Processing Logs**: Check server logs for detailed error information
- **Confidence Scores**: Use confidence indicators to prioritize manual review
- **Original Text**: Review extracted text to understand AI analysis
- **Validation Errors**: Check data format and required fields

## Conclusion

The AI Extraction Handler provides intelligent, automated document processing that significantly reduces manual data entry while maintaining high accuracy through human review processes. It supports the complete range of UK property management documents and provides structured data ready for production use.
