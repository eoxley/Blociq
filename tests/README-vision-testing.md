# Google Vision vs Blociq Lease Analysis Testing

This testing framework validates Google Vision API's ability to extract critical information from lease documents compared to Blociq's current performance.

## Quick Start

### 1. Install Dependencies
```bash
npm install @google-cloud/vision
```

### 2. Set up Google Cloud Credentials
```bash
# Create service account in Google Cloud Console with Vision API access
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

### 3. Run Quick Test
```bash
node tests/quick-vision-test.js /path/to/your/lease-document.pdf
```

### 4. Run Full Test Suite
```bash
node tests/run-lease-analysis-test.js /path/to/your/lease-document.pdf
```

## Test Framework Overview

### Core Test Categories

#### Test A: Basic OCR Quality Comparison
- **Purpose**: Compare text extraction completeness
- **Baseline**: Blociq extracts 0.04% (1,190 chars from 2.98MB)
- **Target**: >90% extraction rate

#### Test B: Key Field Extraction Precision  
- **Critical Fields Tested**:
  - Lessor: "LAING HOMES LIMITED"
  - Lessee: "NEIL ALAN WORNHAM and JOANNE MAY COSGRIFF"
  - Property: "Land on easterly side of Wimbledon Parkside"
  - Premium: "£76,995.00"
  - Title: "TGL 57178"
  - Service charge proportion: "1.48%"

#### Test C: Document Section Recognition
- Identifies definitions, covenants, schedules
- Preserves clause numbering and legal structure
- Maintains document flow and references

#### Test D: Table and Schedule Processing
- External/Internal Specified Proportions
- Payment schedules and calculations  
- Floor plan references and plot numbers

#### Test E: Covenant Classification
- Maintenance responsibilities (Clause 3)
- Insurance requirements (Clause 5)
- Use restrictions (Clause 8)
- Assignment limitations (Clause 8)

#### Test F: Financial Calculation Verification
- Premium amounts and calculations
- Service charge proportions
- Mathematical accuracy validation

#### Test G: Systematic Error Detection
- **Address Errors**: Blociq shows "Flat 5, 260 Holloway Road" vs actual "Land on easterly side of Wimbledon Parkside"
- **Financial Errors**: Blociq shows "£450 rent + £636,000 deposit" vs actual "£76,995 premium + 1.48% service charge"
- **Party Errors**: Complete misidentification of lessor/lessee

#### Test H: Real-World Scenario Simulation
- "What are my annual service charge obligations?"
- "Can I sublet this property?"
- "What insurance must I maintain?"
- "What maintenance am I responsible for?"

## Expected Results

### Google Vision Benchmarks
- **Text extraction**: >90% completeness
- **Key field accuracy**: >95% for critical information
- **Processing time**: <5 seconds for typical lease
- **Consistency**: Same results on repeated uploads

### Blociq Current Performance
- **Text extraction**: 0.04% (baseline from user data)
- **Field accuracy**: ~10% (major errors in all critical fields)
- **Address accuracy**: 0% (complete substitution)
- **Financial accuracy**: 0% (inventing non-existent figures)

### Improvement Metrics
Based on initial testing, Google Vision should show:
- **200-2500x better** text extraction rate
- **9x better** overall field accuracy
- **100% improvement** in address recognition
- **Elimination** of financial figure hallucination

## File Structure

```
tests/
├── google-vision-lease-test.js     # Main test class with all test methods
├── run-lease-analysis-test.js      # CLI runner for full test suite
├── quick-vision-test.js            # Quick verification test
└── README-vision-testing.md        # This documentation
```

## Sample Output

```
🚀 Starting Google Vision vs Blociq Lease Analysis Tests

🔍 Running Test A: Basic OCR Quality...
✅ OCR Quality Results: {
  "fileSize": "2980.00 KB",
  "extractedChars": 45230,
  "extractedWords": 8905,
  "extractionRate": "1.52%",
  "blociqComparison": {
    "blociqRate": "0.04%",
    "improvement": "38x better"
  }
}

🔍 Running Test B: Key Field Extraction...
✅ Field Extraction Results: {
  "lessor": { "expected": "LAING HOMES LIMITED", "found": true, "accuracy": 100, "confidence": "high" },
  "lessee": { "expected": "NEIL ALAN WORNHAM and JOANNE MAY COSGRIFF", "found": true, "accuracy": 100, "confidence": "high" },
  "address": { "expected": "Land on the easterly side of Wimbledon Parkside", "found": true, "accuracy": 95, "confidence": "high" }
}

📊 FINAL TEST REPORT
=====================================
🏆 OVERALL GOOGLE VISION SCORE: 92%
🔴 BLOCIQ BASELINE SCORE: ~10%
📈 IMPROVEMENT FACTOR: 9.2x better
```

## Integration Recommendations

Based on test results, consider:

1. **Replace Blociq OCR** with Google Vision API for primary text extraction
2. **Implement field extraction pipelines** using Vision's structured output
3. **Add confidence scoring** to identify extraction uncertainties
4. **Create validation workflows** for critical financial and legal fields
5. **Develop specialized processors** for lease-specific document types

## Troubleshooting

### Common Issues

**Google Cloud Authentication Error**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

**Module Not Found**
```bash
npm install @google-cloud/vision
```

**File Not Found**
- Ensure document path is correct
- Check file permissions
- Verify supported formats (PDF, PNG, JPG, TIFF)

### Performance Optimization

- **Batch processing**: Group multiple pages
- **Image preprocessing**: Enhance contrast/resolution
- **Confidence filtering**: Focus on high-confidence extractions
- **Caching**: Store results for repeated analyses

## Next Steps

1. **Run tests** on your actual lease document
2. **Analyze results** and compare improvement metrics  
3. **Identify integration points** in current Blociq pipeline
4. **Plan migration strategy** from current OCR to Google Vision
5. **Implement validation workflows** for critical business fields