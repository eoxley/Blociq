# Document AI Processor Setup Guide

## Current Status ✅
- **Google Document AI package installed**: `@google-cloud/documentai`
- **Configuration files created**: OCR config and API endpoints
- **Scripts ready**: Processor creation and Vercel function

## Required Environment Variables

You need to set these in **Vercel Environment Variables**:

```bash
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"blociq-vision-ocr","private_key":"-----BEGIN PRIVATE KEY-----\n[YOUR_PRIVATE_KEY]\n-----END PRIVATE KEY-----","client_email":"blociq-document-ai-service@blociq-vision-ocr.iam.gserviceaccount.com"}

GOOGLE_CLOUD_PROJECT_ID=blociq-vision-ocr
DOCUMENT_AI_LOCATION=us
```

## Two Ways to Create the Processor

### Option 1: Using Local Script (if you have credentials)
```bash
# Set environment variables locally first
export GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'
export GOOGLE_CLOUD_PROJECT_ID="blociq-vision-ocr"
export DOCUMENT_AI_LOCATION="us"

# Run the script
node scripts/create-document-ai-processor.js
```

### Option 2: Using Vercel Function (Recommended)

1. **Set Environment Variables in Vercel Dashboard:**
   - Go to your Vercel project settings
   - Add the three environment variables above
   - Deploy your changes

2. **Create the Processor:**
   ```bash
   # Make a POST request to your deployed app
   curl -X POST https://your-vercel-app.vercel.app/api/setup-document-ai
   ```

3. **Copy the Processor ID:**
   - The response will contain a `processorId`
   - Add this as `DOCUMENT_AI_PROCESSOR_ID` to Vercel environment variables

## Expected Response
```json
{
  "success": true,
  "message": "Document AI processor created successfully!",
  "processorId": "abc123def456",
  "instruction": "Add this to your Vercel environment variables: DOCUMENT_AI_PROCESSOR_ID=abc123def456"
}
```

## Final Environment Variables
After completion, you should have all four:

```bash
GOOGLE_APPLICATION_CREDENTIALS_JSON=[full JSON credentials]
GOOGLE_CLOUD_PROJECT_ID=blociq-vision-ocr
DOCUMENT_AI_LOCATION=us
DOCUMENT_AI_PROCESSOR_ID=[processor ID from creation]
```

## Testing the Integration

Once processor is created:

```bash
# Test the new Document AI OCR endpoint
curl -X POST https://your-vercel-app.vercel.app/api/ocr-document-ai \
  -F "file=@your-lease.pdf"
```

## Troubleshooting

**Common Issues:**
- Ensure Document AI API is enabled in Google Cloud Console
- Service account needs "Document AI Admin" role
- JSON credentials must be properly escaped for environment variables
- Processor creation can take a few minutes

**Check API Status:**
```bash
curl https://your-vercel-app.vercel.app/api/setup-document-ai
```

## Files Created
- ✅ `scripts/create-document-ai-processor.js` - Local script
- ✅ `app/api/setup-document-ai/route.ts` - Vercel function  
- ✅ `app/api/ocr-document-ai/route.ts` - OCR endpoint
- ✅ `lib/ocr/document-ai-config.ts` - Configuration