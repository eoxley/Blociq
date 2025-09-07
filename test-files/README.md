# Test Files for Compliance Upload

## Required Test File

Place `Ashwood_EICR_2023.pdf` in this directory to test the compliance upload system.

## Expected Results

When uploading `Ashwood_EICR_2023.pdf`, the system should auto-populate:

- **Asset**: EICR (Electrical Installation Condition Report)
- **Building**: Ashwood House
- **Inspection date**: 15/07/2023
- **Validity**: 5 years
- **Next due date**: 15/07/2028
- **Category 1 issues**: none (0)
- **Status**: Compliant / Satisfactory

## Running Tests

```bash
# Make sure the dev server is running
npm run dev

# Run the compliance upload test
node scripts/test-compliance-upload.js
```

## Test Scenarios

1. **Valid PDF**: Should extract text and parse EICR data
2. **Invalid file type**: Should reject with friendly error
3. **Image file**: Should skip text extraction
4. **Corrupted PDF**: Should handle gracefully
