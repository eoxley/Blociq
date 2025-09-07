# Compliance Regex Maps

## Purpose & Scope

The Compliance Regex Maps system provides a versioned, maintainable way to detect and parse compliance documents automatically. It supports 12+ document types including EICR, FRA, EWS1, Emergency Lighting, Fire Alarm, Fire Doors, Asbestos, Water Risk, Lightning Protection, Lift LOLER, Sprinkler, and Insurance documents.

## How Detection Works

### Primary Signals
Each document type is detected using multiple regex patterns that look for:
- **Document titles**: "Electrical Installation Condition Report", "Fire Risk Assessment"
- **Standards references**: "BS 7671", "BS 5839", "HSG274"
- **Acronyms**: "EICR", "FRA", "EWS1", "LOLER"
- **Key phrases**: "Policy Number", "Thorough Examination"

### Confidence Scoring
Detection uses a confidence scoring system:
- **Detection patterns**: 0.5 points per match
- **Main fields** (inspection_date): 1.0 points per match  
- **Other fields**: 0.3 points per match

The highest scoring type is selected as the document type.

## Field Extraction

### Supported Field Types
- **Dates**: Automatically normalized to ISO YYYY-MM-DD format
- **Text fields**: Raw extracted text
- **Classification counts**: C1, C2, C3, FI codes
- **Risk ratings**: Tolerable, Moderate, Substantial, Intolerable
- **Currency**: £ amounts with proper formatting

### Date Normalization
The system supports multiple UK date formats:
- `DD/MM/YYYY` → `2023-07-15`
- `DD-MM-YYYY` → `2023-07-15`
- `DD Month YYYY` → `2023-07-15`
- `DD/MM/YY` → `2023-07-15` (assumes 20xx)

## Document Type Mappings

### EICR (Electrical Installation Condition Report)
- **Detection**: "Electrical Installation Condition Report", "EICR", "BS 7671"
- **Fields**: inspection_date, result, classification_counts (C1, C2, C3, FI)
- **Due Date**: 5 years from inspection
- **Status Rules**:
  - `result==Satisfactory && C1==0` → "Compliant"
  - `result==Unsatisfactory || C1>0` → "ActionRequired"

### FRA (Fire Risk Assessment)
- **Detection**: "Fire Risk Assessment", "FRA" (not FRAEW)
- **Fields**: inspection_date, risk_rating, review_due
- **Due Date**: 1 year from inspection
- **Status Rules**:
  - `risk_rating in ['Intolerable','Substantial']` → "ActionRequired"
  - `true` → "Compliant"

### FRAEW/EWS1 (External Wall System)
- **Detection**: "EWS1", "External Wall System", "FRAEW"
- **Fields**: class (A1, A2, B1, B2), inspection_date
- **Due Date**: 5 years from inspection
- **Status Rules**:
  - `class=='B2'` → "ActionRequired"
  - `true` → "Compliant"

### Emergency Lighting
- **Detection**: "Emergency Lighting", "Monthly Function Test", "Annual Duration Test"
- **Fields**: inspection_date, test_type
- **Due Date**: 
  - Annual Duration Test → 1 year
  - Monthly Function Test → 1 month

### Fire Alarm
- **Detection**: "Fire Alarm", "Fire Detection", "BS 5839"
- **Fields**: inspection_date, frequency
- **Due Date**: Based on frequency hint

### Fire Doors
- **Detection**: "Fire Door", "Door Inspection"
- **Fields**: inspection_date, defects
- **Due Date**: 6 months from inspection

### Asbestos
- **Detection**: "Asbestos Survey", "Asbestos Register", "Management Survey"
- **Fields**: inspection_date, survey_type
- **Due Date**: 1 year from inspection

### Water Risk (Legionella)
- **Detection**: "Legionella", "Water Risk Assessment", "HSG274", "L8"
- **Fields**: inspection_date, review
- **Due Date**: From review field or 2 years default

### Lightning Protection
- **Detection**: "Lightning Protection", "BS EN 62305"
- **Fields**: inspection_date
- **Due Date**: 1 year from inspection

### Lift LOLER
- **Detection**: "LOLER", "Thorough Examination"
- **Fields**: inspection_date, lift_type
- **Due Date**:
  - Passenger lifts → 6 months
  - Goods lifts → 12 months

### Sprinkler
- **Detection**: "Sprinkler", "BS EN 12845"
- **Fields**: inspection_date
- **Due Date**: 1 year from inspection

### Insurance
- **Detection**: "Policy Number", "Schedule of Insurance", "Insured By"
- **Fields**: period_from, period_to, policy_number, buildings_sum_insured
- **Due Date**: Not applicable (insurance period based)
- **Status**: Does not affect compliance status

## Default Cycles

| Document Type | Cycle | Notes |
|---------------|-------|-------|
| EICR | 5 years | Electrical safety |
| FRA | 1 year | Fire risk assessment |
| FRAEW/EWS1 | 5 years | External wall system |
| Emergency Lighting | 1 year/1 month | Annual/Monthly tests |
| Fire Alarm | Variable | Based on frequency |
| Fire Doors | 6 months | Door inspection |
| Asbestos | 1 year | Survey/register |
| Water Risk | 2 years | Legionella assessment |
| Lightning Protection | 1 year | Protection system |
| Lift LOLER | 6/12 months | Passenger/Goods |
| Sprinkler | 1 year | Sprinkler system |
| Insurance | N/A | Policy period based |

## How to Add/Adjust Patterns

### 1. Edit YAML Configuration
Edit `config/compliance/regex-map.v1.yaml`:
```yaml
types:
  YourNewType:
    detect:
      - "Your Detection Pattern"
    fields:
      your_field:
        patterns: "Your Field Pattern"
    compute:
      next_due_years: 1
    map:
      assessment_type: "YourNewType"
```

### 2. Bump Version
When making changes:
1. Copy `regex-map.v1.yaml` to `regex-map.v2.yaml`
2. Update the version number
3. Update the loader to use the new version

### 3. Test Changes
Run the test suite:
```bash
npm test lib/compliance/__tests__/regexMap.spec.ts
```

### 4. Deploy
The system automatically loads the latest version unless `COMPLIANCE_REGEX_VERSION` is set.

## Field → Summary JSON Mapping

| Field | Summary JSON Key | Notes |
|-------|------------------|-------|
| inspection_date | inspection_date | Normalized to ISO format |
| result | result | Satisfactory/Unsatisfactory |
| risk_rating | risk_rating | Risk level |
| class | class | EWS1 classification |
| test_type | test_type | Test type |
| frequency | frequency | Test frequency |
| defects | defects | Number of defects |
| survey_type | survey_type | Survey type |
| review | review | Review requirements |
| lift_type | lift_type | Lift type |
| period_from | period_from | Insurance start |
| period_to | period_to | Insurance end |
| policy_number | policy_number | Policy reference |
| buildings_sum_insured | buildings_sum_insured | Sum insured |

## Integration with Compliance Uploader

The regex map system integrates with the compliance uploader pipeline:

1. **Text Extraction**: After PDF text extraction
2. **Document Detection**: `detectDocType(pageMap)`
3. **Field Extraction**: `extractFields(type, pageMap)`
4. **Due Date Calculation**: `computeDueDates(type, fields)`
5. **Summary Generation**: `toSummaryJson(type, fields, due)`
6. **Compliance Patch**: `toCompliancePatch(type, fields, due)`

## Error Handling

### No Detection Match
If no document type is detected, the UI shows:
> "Couldn't determine document type — choose type manually or use Lease Lab."

### Invalid Patterns
Invalid regex patterns are logged as warnings and skipped.

### Missing Fields
Missing required fields result in partial extraction with available data.

## Versioning & Operations

### Environment Variables
- `COMPLIANCE_REGEX_VERSION`: Pin to specific version (e.g., "v1")
- Default: Loads latest version

### Logging
Match counts and version information are logged to `ai_logs/parser_logs`.

### Backward Compatibility
- Add new patterns rather than modifying existing ones
- Keep changes backward-compatible
- Test thoroughly before deployment

## Guidance for Scanned Documents

If a document contains no extractable text (scanned images):
- **Don't attempt OCR** in the compliance uploader
- **Redirect to Lease Lab** for OCR processing
- **Show appropriate message** to user

## Testing

### Unit Tests
Comprehensive test suite covers:
- Date normalization
- Document type detection
- Field extraction
- Due date calculation
- Summary generation
- Integration scenarios

### Test Data
Each document type includes 1-2 fixture snippets that test:
- Correct type detection
- Inspection date extraction
- Plausible due date calculation
- Summary JSON structure

### Running Tests
```bash
# Run all compliance tests
npm test lib/compliance/__tests__/regexMap.spec.ts

# Run with coverage
npm test -- --coverage lib/compliance/__tests__/regexMap.spec.ts
```

## Future Enhancements

### Planned Features
- **Machine Learning**: ML-based document type detection
- **Pattern Learning**: Automatic pattern extraction from new documents
- **Multi-language**: Support for Welsh and other languages
- **Advanced Rules**: More complex status rule evaluation

### Version 2 Considerations
- **Enhanced date formats**: Support for more international formats
- **Better confidence scoring**: ML-based confidence calculation
- **Pattern validation**: Automatic regex pattern validation
- **Performance optimization**: Caching and optimization improvements
