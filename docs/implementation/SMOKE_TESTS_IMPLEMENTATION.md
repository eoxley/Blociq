# BlocIQ Smoke Tests Implementation

## Overview

Comprehensive smoke tests have been implemented to verify critical system components in production/preview environments. The tests verify:

1. **Google Vision OCR** returns real text (inline flow, small PDF)
2. **Dashboard API** returns 200 and complete JSON shape (no 500s, no empty body)
3. **Database** contains at least one document with extracted text (optional/soft)

## Files Added/Modified

### Package.json Changes
```diff
+ "test:smoke:ocr": "vitest run tests/smoke/ocr.inline.test.ts --reporter=dot",
+ "test:smoke:dashboard": "vitest run tests/smoke/dashboard.test.ts --reporter=dot", 
+ "test:smoke:db": "vitest run tests/smoke/db.textPresence.test.ts --reporter=dot",
+ "test:smoke": "pnpm -s test:smoke:ocr && pnpm -s test:smoke:dashboard && pnpm -s test:smoke:db",
+ "test:smoke:simple": "node test-smoke-runner.js",

+ "pdfkit": "^0.15.0",
+ "tsx": "^4.7.0", 
+ "vitest": "^2.0.0"
```

### New Test Files

#### `tests/smoke/ocr.inline.test.ts`
- Generates small PDF in-memory using PDFKit
- Posts multipart to `/upload?engine=vision&returnSample=true`
- Asserts: success=true, engine=vision, textLength > 20, sample contains "BlocIQ"
- Skips if OCR_BASE_URL or OCR_AUTH_TOKEN missing

#### `tests/smoke/dashboard.test.ts`
- Calls `/api/inbox/dashboard?timeRange=week`
- Asserts: HTTP 200, all required keys present, correct data types
- Skips if SITE_URL missing

#### `tests/smoke/db.textPresence.test.ts`
- Checks `building_documents` and `documents` tables for extracted text
- Soft mode: warns if no text found (default)
- Strict mode: fails if no text found (when SMOKE_STRICT=true)
- Skips if Supabase credentials missing

#### `test-smoke-runner.js`
- Simple Node.js runner that doesn't depend on complex build configurations
- Alternative to vitest for environments with build issues
- Same test logic but with better error handling

#### `vitest.config.ts`
- Vitest configuration for running the TypeScript tests
- Node environment with appropriate timeouts

#### `tests/smoke/README.md`
- Comprehensive documentation for running the tests
- Environment variable setup instructions
- Success criteria and troubleshooting

## Environment Variables Required

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
npm install

# Run all smoke tests (vitest)
npm run test:smoke

# Run simple smoke tests (Node.js)
npm run test:smoke:simple

# Run individual tests
npm run test:smoke:ocr
npm run test:smoke:dashboard  
npm run test:smoke:db
```

## Success Criteria

- **OCR test**: success=true, engine=vision, textLength > 20, sample contains "BlocIQ"
- **Dashboard test**: HTTP 200 and all required keys present; no 500 "getAll is not a function"
- **DB text (strict)**: at least one row in canonical store with extracted text length > 0

## Key Features

1. **No Database Writes**: Tests are read-only and do not modify the database
2. **Environment-Aware**: Tests skip gracefully when required environment variables are missing
3. **Dual Runners**: Both vitest (TypeScript) and simple Node.js runners available
4. **Comprehensive Coverage**: Tests all critical system components
5. **Production-Ready**: Designed to run against live production/preview environments
6. **Diagnostic Output**: Provides useful information for troubleshooting failures

## Implementation Notes

- Tests use Node ≥18 with global fetch, FormData, and Blob support
- PDFKit generates minimal test PDFs in-memory
- Supabase client uses service role key for read-only database access
- All tests have appropriate timeouts (20-30 seconds)
- Error handling ensures tests fail gracefully with useful error messages
- Soft mode for database tests prevents false failures in clean environments

The implementation provides a robust testing framework that can be used in CI/CD pipelines or manual verification of system health.
