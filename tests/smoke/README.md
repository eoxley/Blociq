# Smoke Tests

These tests verify that critical system components are working correctly in production/preview environments.

## Prerequisites

Set the following environment variables:

```bash
# Required for OCR test
export OCR_BASE_URL="https://<render-app>.onrender.com"
export OCR_AUTH_TOKEN="********"

# Required for dashboard test
export SITE_URL="https://www.blociq.co.uk"

# Required for database test
export SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="********"

# Optional: strict mode for DB test
export SMOKE_STRICT="true"
```

## Running Tests

```bash
# Install dependencies
pnpm install

# Run all smoke tests
pnpm test:smoke

# Run individual tests
pnpm test:smoke:ocr
pnpm test:smoke:dashboard
pnpm test:smoke:db
```

## Test Descriptions

### OCR Inline Test (`ocr.inline.test.ts`)
- Generates a small PDF in-memory using PDFKit
- Sends it to the OCR service with Google Vision engine
- Verifies: success=true, engine=vision, textLength > 20, sample contains "BlocIQ"
- Skips if OCR_BASE_URL or OCR_AUTH_TOKEN are missing

### Dashboard Test (`dashboard.test.ts`)
- Calls `/api/inbox/dashboard?timeRange=week`
- Verifies: HTTP 200, complete JSON shape with all required keys
- Checks data types for critical fields
- Skips if SITE_URL is missing

### Database Text Presence Test (`db.textPresence.test.ts`)
- Checks for extracted text in `building_documents` and `documents` tables
- Soft mode: warns if no text found (default)
- Strict mode: fails if no text found (when SMOKE_STRICT=true)
- Skips if Supabase credentials are missing

## Success Criteria

- **OCR test**: Returns real text from Google Vision OCR
- **Dashboard test**: Returns HTTP 200 with complete JSON structure
- **DB test**: Finds at least one document with extracted text (in strict mode)

## Notes

- Tests are read-only and do not modify the database
- Tests generate minimal test data (small PDF) and clean up after themselves
- All tests have appropriate timeouts and error handling
- Missing environment variables cause tests to skip rather than fail
