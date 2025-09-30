# Archived Demo Data Scripts

This directory contains scripts that were used for seeding demo data during development and testing.

## Archived Files

### Mock Major Works Data
- `addMoreMockMajorWorksData.sql` - Additional mock major works data
- `createMockMajorWorksData.sql` - Creates mock major works data
- `insertCorrectMockMajorWorksData.sql` - Corrected mock major works data
- `insertMockMajorWorksData.sql` - Inserts mock major works data
- `insertDataOnly.sql` - Data-only insert script

### Sample Data Scripts
- `add-sample-inbox-data.sql` - Sample inbox data for testing
- `addSampleComplianceData.sql` - Sample compliance data
- `seed-compliance-data-correct-schema.sql` - Compliance data with correct schema
- `upload-sample-pdfs.sql` - Sample PDF uploads for testing

## Why Archived

These scripts were archived because they:

1. **Contain Demo Data** - Scripts insert specific demo data like "Ashwood House" rather than generic test data
2. **Not Production Ready** - Scripts are designed for development/testing environments
3. **Specific Test Scenarios** - Scripts create specific test scenarios rather than clean, generic data
4. **Development Tools** - Scripts were used for manual testing during development

## Production Usage

For production environments:

1. **Clean Database** - Use only schema migrations, not data seeding scripts
2. **Generic Test Data** - Create generic test data without specific building names
3. **Controlled Seeding** - Use controlled, documented seeding processes
4. **No Demo Data** - Avoid any scripts that reference specific demo buildings or data

## Migration Notes

When setting up production:
- ✅ Archive demo data scripts (done)
- ✅ Use clean schema migrations only (done)
- ✅ Avoid specific building names in scripts (done)
- ✅ Create generic test data when needed (done)

## Usage

If you need to run these scripts for development purposes:

1. Ensure you're in a development environment
2. Run scripts individually as needed
3. Do not include these scripts in production deployments
4. Replace with generic test data for testing scenarios
