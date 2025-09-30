# Complete OCR PDF Processing Setup Guide

## 🎯 Overview
This guide sets up a robust PDF text extraction system with multiple OCR fallbacks for your Next.js application.

## 📦 Installation

### 1. Install Dependencies
```bash
# Run the installation script
./install-ocr-dependencies.sh

# Or install manually:
npm install --save tesseract.js pdfjs-dist google-auth-library
npm install --save-dev @types/pdfjs-dist
```

### 2. Add PDF.js Worker
Download and place PDF.js worker in your public directory:
```bash
# Download PDF.js worker
wget https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js -O public/pdf.worker.min.js
```

## 🔧 Environment Configuration

### Required Environment Variables

Add these to your `.env.local` file:

```env
# OpenAI API (Most reliable for PDFs)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Google Vision API (Option 1: API Key)
GOOGLE_VISION_API_KEY=your-google-vision-api-key

# Google Vision API (Option 2: Service Account JSON)
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account","project_id":"your-project",...}'

# Google Vision API (Option 3: Individual service account fields)
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
GOOGLE_PROJECT_ID=your-google-cloud-project-id
```

### Google Cloud Setup

1. **Enable Vision API:**
   ```bash
   gcloud services enable vision.googleapis.com
   ```

2. **Create API Key (Option 1):**
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Click "Create Credentials" → "API Key"
   - Restrict the key to Vision API only

3. **Create Service Account (Option 2):**
   ```bash
   gcloud iam service-accounts create ocr-service-account
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:ocr-service-account@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/ml.developer"
   gcloud iam service-accounts keys create key.json \
     --iam-account=ocr-service-account@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

## 🧪 Testing

### 1. Check System Status
```bash
curl http://localhost:3000/api/test-pdf-extraction
```

### 2. Test with File Upload
```bash
curl -X POST -F "file=@your-document.pdf" http://localhost:3000/api/test-pdf-extraction
```

### 3. Test Main Upload Endpoint
```bash
curl -X POST -F "file=@your-document.pdf" http://localhost:3000/api/ask-ai/upload
```

### 4. Interactive Browser Test
Visit: `http://localhost:3000/test-ask-ai-upload.html`

## 🔄 OCR Processing Chain

The system tries extraction methods in this order:

### 1. **PDF.js** (Text-based PDFs)
- ✅ Fast and free
- ✅ Works offline
- ❌ Only text-based PDFs
- **Best for:** Digitally created PDFs

### 2. **OpenAI Vision** (Most reliable)
- ✅ Handles scanned PDFs excellently
- ✅ High accuracy for complex documents
- ✅ Good at legal document structure
- ❌ Costs per request
- **Best for:** Scanned documents, complex layouts

### 3. **Google Vision** (Fallback)
- ✅ Good OCR accuracy
- ✅ Fast processing
- ❌ More complex authentication
- **Best for:** General document OCR

### 4. **Tesseract.js** (Local fallback)
- ✅ Works offline
- ✅ Free
- ❌ Slower processing
- ❌ Lower accuracy
- **Best for:** Fallback when APIs fail

### 5. **Test Mode** (Development)
- ✅ Always works
- ✅ Provides sample lease content
- **Best for:** Development and testing

## 📊 Expected Response Format

```json
{
  "success": true,
  "extractedText": "LEASE AGREEMENT\n\nProperty: Flat 5, 260 Holloway Road...",
  "textLength": 15420,
  "ocrSource": "openai_vision",
  "filename": "lease-document.pdf",
  "documentType": "lease_agreement",
  "summary": "Document processed: 15420 characters extracted via openai_vision. Ready for AI analysis.",
  "analysis": "Successfully extracted 15420 characters from lease-document.pdf using openai_vision...",
  "confidence": 0.95,
  "metadata": {
    "fileType": "application/pdf",
    "fileSizeMB": "1.85",
    "ocrMethod": "openai_vision",
    "processingTime": 3500,
    "pageCount": 12
  }
}
```

## 🚨 Troubleshooting

### Google Vision 422 Errors
```bash
# Check API is enabled
gcloud services list --enabled | grep vision

# Check quotas
gcloud auth application-default quota list --service=vision.googleapis.com

# Test authentication
gcloud auth application-default print-access-token
```

### OpenAI Errors
- **401 Unauthorized:** Check OPENAI_API_KEY is valid
- **429 Rate Limit:** You've exceeded your quota
- **413 Payload Too Large:** File is >100MB

### PDF.js Errors
- **Worker not found:** Ensure `pdf.worker.min.js` is in `/public/`
- **CORS errors:** Check worker path is correct

### Tesseract Errors
- **Memory issues:** Large files may fail, implement size limits
- **Language pack missing:** Tesseract.js downloads English automatically

## 🔍 Debug Commands

```bash
# Check environment variables
node -e "console.log('OpenAI:', !!process.env.OPENAI_API_KEY)"
node -e "console.log('Google Vision:', !!process.env.GOOGLE_VISION_API_KEY)"

# Test PDF.js worker
curl http://localhost:3000/pdf.worker.min.js

# Check API endpoint
curl -X GET http://localhost:3000/api/test-pdf-extraction
```

## 📝 Sample Lease Content

Your lease document should extract content like:
```
LEASE AGREEMENT

Property: Flat 5, 260 Holloway Road, London N7 8PE

PARTIES:
Lessor: Kensington & Edinburgh Estates Ltd
Lessee: Robert Jonathan Phipps

FINANCIAL DETAILS:
Premium: £636,000
Term: 125 years (2015-2140)
Initial Rent: £450 per annum
```

## 🚀 Production Deployment

1. **Vercel Environment Variables:**
   ```bash
   vercel env add OPENAI_API_KEY
   vercel env add GOOGLE_VISION_API_KEY
   ```

2. **Check Deployment:**
   ```bash
   curl https://your-app.vercel.app/api/test-pdf-extraction
   ```

3. **Monitor Performance:**
   - Check Vercel function logs
   - Monitor OpenAI usage costs
   - Track extraction success rates

## ✅ Success Criteria

- [ ] `/api/test-pdf-extraction` returns `readyForProduction: true`
- [ ] Lease PDF extracts actual text (not test content)
- [ ] `extractedText` field contains document content
- [ ] `textLength > 0` for real documents
- [ ] AI chat can reference document content

**Your system will now extract real text from PDF documents!**