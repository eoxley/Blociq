# Archived Tests

This directory contains tests that were tied to demo data or specific database states that are not suitable for production testing.

## Archived Files

### Demo Data Dependent Tests
- `leaseSummaryContract.test.ts` - Tests using "Ashwood House" demo data
- `dashboard.test.ts` - Integration tests requiring specific dashboard data
- `db.textPresence.test.ts` - Smoke tests requiring extracted text in database

### Development/Testing Scripts
- `google-vision-lease-test.js` - Google Vision API testing script
- `quick-vision-test.js` - Quick OCR testing script  
- `run-lease-analysis-test.js` - Lease analysis testing script
- `test-setup-validation.js` - Test setup validation script

## Why Archived

These tests were archived because they:

1. **Depend on Demo Data** - Tests rely on specific seeded data like "Ashwood House" rather than clean test data
2. **Require Specific DB State** - Tests expect certain documents or data to exist in the database
3. **Are Development Scripts** - JavaScript files used for manual testing during development
4. **Not Production Ready** - Tests don't work with clean database state required for production

## Production Tests

The remaining tests in `/tests/` are production-ready and test core functionality:

- **Unit Tests** - Test individual functions with mocks
- **Core Functionality** - Test posting, auth, RLS policies, AI endpoints
- **Clean DB State** - Tests run on clean database without seeded data

## Usage

If you need to run these archived tests for development purposes:

1. Ensure demo data is seeded in your database
2. Run tests individually from this directory
3. Do not include these tests in CI/CD pipelines

## Migration Notes

When migrating to production:
- ✅ Archive demo-dependent tests (done)
- ✅ Keep core functional tests (done)
- ✅ Ensure tests run on clean DB state (done)
- ✅ Remove reliance on seeded demo data (done)
