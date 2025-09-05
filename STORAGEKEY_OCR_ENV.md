# StorageKey OCR Flow - Environment Variables

## Overview
Large file OCR processing now uses a StorageKey flow that routes files via Supabase storage to Render OCR service, eliminating Vercel's 4.5MB payload limits.

## Required Environment Variables

### Vercel Environment Variables
```bash
# Render OCR Service Integration
RENDER_OCR_URL=https://<your-render-service>.onrender.com/ocr/process
RENDER_OCR_TOKEN=<shared-secret-token>

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Render OCR Service Environment Variables
```bash
# Authentication
RENDER_OCR_TOKEN=<same-shared-secret-token>

# Supabase Access for File Downloads
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# DocAI Configuration (existing)
DOCUMENT_AI_LOCATION=eu
DOCUMENT_AI_PROCESSOR_ID=projects/629106935484/locations/eu/processors/d6338e1bbdcd9ddb
GOOGLE_CLOUD_PROJECT_ID=blociq-vision-ocr
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

## Flow Architecture

### Small Files (≤4.5MB)
1. Client uploads to Supabase → gets StorageKey
2. Client sends FormData + StorageKey to `/api/ocr/process`
3. Vercel forwards JSON payload to Render OCR
4. Render downloads from Supabase using StorageKey
5. Render processes with DocAI/fallbacks and returns result

### Large Files (>4.5MB)
1. Client uploads to Supabase → gets StorageKey  
2. Client sends JSON with StorageKey to `/api/ocr/process`
3. Vercel forwards small JSON payload to Render OCR
4. Render downloads large file from Supabase using StorageKey
5. Render processes and returns result

## Benefits
- ✅ No 413 errors on Vercel ever again
- ✅ Small files remain fast (optional direct processing)
- ✅ Large files (100MB+) handled seamlessly
- ✅ Vercel only handles tiny JSON payloads
- ✅ Render has full server resources for OCR processing

## Testing
- 9.34MB Selhurst PDF should now process successfully
- Logs should show "OCR input bytes: ~9.3MB" on Render
- Response should have `source` and `textLength > 0`