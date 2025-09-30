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

# Storage Bucket Configuration (NEW)
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=building_documents
```

### Render OCR Service Environment Variables
```bash
# Authentication
RENDER_OCR_TOKEN=<same-shared-secret-token>

# Supabase Access for File Downloads
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Storage Bucket Configuration (NEW)
SUPABASE_STORAGE_BUCKET=building_documents

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

## Supabase Bucket Setup

### 1. Create Storage Bucket
In your Supabase project dashboard:
1. Go to **Storage** → **Buckets**
2. Create a new bucket named `building_documents`
3. Set appropriate permissions (public read if needed)

### 2. Bucket Permissions
Ensure the bucket has proper RLS policies for:
- File uploads from authenticated users
- File downloads from service role

## Benefits
- ✅ No 413 errors on Vercel ever again
- ✅ Small files remain fast (optional direct processing)
- ✅ Large files (100MB+) handled seamlessly
- ✅ Vercel only handles tiny JSON payloads
- ✅ Render has full server resources for OCR processing
- ✅ Configurable bucket names for different environments

## Error Handling

### Bucket Not Found Errors
If the bucket doesn't exist, users will see:
```json
{
  "success": false,
  "reason": "bucket-not-found", 
  "bucket": "building_documents",
  "analysis": "Unable to upload file to Supabase. The storage bucket \"building_documents\" was not found..."
}
```

### StorageKey Validation
- StorageKeys are automatically stripped of bucket prefixes
- Format: `ocr-temp/1234567890-filename.pdf` (no bucket prefix)
- Downloads use: `supabase.storage.from(BUCKET).download(objectKey)`

## Testing
- 9.34MB Selhurst PDF should now process successfully
- Logs should show "OCR input bytes: ~9.3MB" on Render
- Response should have `source` and `textLength > 0`
- No more "Bucket not found" errors with proper setup