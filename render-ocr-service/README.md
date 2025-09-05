# BlocIQ Render OCR Service

This service handles large file OCR processing on Render, working with the Vercel StorageKey proxy flow.

## Architecture

- **Vercel**: Handles small payloads, uploads files to Supabase, forwards StorageKeys to Render
- **Render**: Downloads files from Supabase using StorageKeys, processes with full OCR pipeline
- **Supabase**: Storage for file handoff between Vercel and Render

## Endpoints

- `GET /health` - Service health check
- `GET /ocr/health` - OCR-specific health check  
- `POST /ocr/process` - Main OCR processing endpoint

## Environment Variables

Set these in your Render service dashboard:

```bash
# Authentication
RENDER_OCR_TOKEN=<shared-secret-with-vercel>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_STORAGE_BUCKET=building_documents

# DocAI (EU)
USE_DOCUMENT_AI=true
DOCUMENT_AI_LOCATION=eu
DOCUMENT_AI_PROCESSOR_ID=projects/629106935484/locations/eu/processors/d6338e1bbdcd9ddb
GOOGLE_CLOUD_PROJECT_ID=blociq-vision-ocr
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}

# OpenAI (fallback)
OPENAI_API_KEY=<openai-key>
```

## Deployment to Render

1. **Create new Web Service** in Render dashboard
2. **Connect GitHub repository** containing this service
3. **Set build/start commands**:
   - Build: `npm install && npm run build`
   - Start: `npm start`
4. **Configure environment variables** (see above)
5. **Deploy**

## Testing

After deployment:

1. **Health Check**: `GET https://your-service.onrender.com/health`
2. **OCR Health**: `GET https://your-service.onrender.com/ocr/health`
3. **Process File**:
   ```bash
   curl -X POST https://your-service.onrender.com/ocr/process \
     -H "Authorization: Bearer <RENDER_OCR_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"storageKey":"ocr-temp/file.pdf","filename":"test.pdf","mime":"application/pdf"}'
   ```

## OCR Pipeline

1. **Download** file from Supabase using storageKey
2. **DocAI EU** → PDF.js → Rasterized PDF → OpenAI Vision (fallback chain)
3. **Return** `{success, source, textLength, extractedText, ...}`

## File Size Support

- No limits on Render service (server-side processing)
- Handles files that exceed Vercel's 4.5MB limit
- Efficient memory usage with streaming where possible