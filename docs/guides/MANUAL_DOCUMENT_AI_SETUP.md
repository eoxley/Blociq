# Manual Document AI Processor Setup Guide

## 🚨 Alternative Authentication Solutions

This guide provides multiple methods to bypass the OpenSSL decoder error and set up Google Document AI authentication for Vercel deployment.

## Problem Summary

- **Issue**: `error:1E08010C:DECODER routines::unsupported`
- **Root Cause**: Vercel environment variables corrupt private keys in service account JSON
- **Solution**: Use alternative authentication methods that don't rely on private keys

---

## Method 1: Google Cloud API Key (RECOMMENDED)

### Step 1: Create API Key in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (`blociq-vision-ocr`)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **API key**
5. Copy the generated API key
6. **IMPORTANT**: Restrict the API key:
   - Click **RESTRICT KEY**
   - Under **API restrictions**, select **Restrict key**
   - Add these APIs:
     - Document AI API
     - Cloud Vision API (if using Vision fallback)

### Step 2: Add API Key to Vercel Environment Variables

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `GOOGLE_CLOUD_API_KEY`
   - **Value**: Your API key from Step 1
   - **Environment**: Production (and Preview if needed)
5. Redeploy your application

### Step 3: Create Document AI Processor

Option A - Via Your Application:
1. Make POST request to: `https://blociq.co.uk/api/setup-document-ai`
2. The endpoint will automatically use API key authentication

Option B - Manual Creation:
1. Go to [Document AI Console](https://console.cloud.google.com/ai/document-ai/processors)
2. Click **CREATE PROCESSOR**
3. Select **Form Parser** processor type
4. Name it: `BlocIQ Lease Document Processor`
5. Choose location: `us` (or your preferred location)
6. Copy the **Processor ID** from the created processor URL
7. Add to Vercel environment variables:
   - **Name**: `DOCUMENT_AI_PROCESSOR_ID`
   - **Value**: The processor ID (just the ID, not the full path)

---

## Method 2: OAuth Access Token

### Step 1: Generate Access Token

```bash
# Install Google Cloud SDK if not already installed
# https://cloud.google.com/sdk/docs/install

# Authenticate with your Google account
gcloud auth login

# Generate access token
gcloud auth print-access-token
```

### Step 2: Add Token to Vercel

1. Go to Vercel Environment Variables
2. Add:
   - **Name**: `GOOGLE_CLOUD_ACCESS_TOKEN`
   - **Value**: The token from Step 1
   - **Environment**: Production

**Note**: Access tokens expire (usually 1 hour). For production use, consider Method 1 or 3.

---

## Method 3: Manual Processor Creation + Direct API

### Step 1: Create Processor Manually

1. Go to [Document AI Console](https://console.cloud.google.com/ai/document-ai/processors)
2. Click **CREATE PROCESSOR**
3. Select **Form Parser** 
4. Name: `BlocIQ Lease Document Processor`
5. Location: `us`
6. Copy the Processor ID

### Step 2: Set Environment Variables

Add to Vercel:
```
DOCUMENT_AI_PROCESSOR_ID=your_processor_id_here
GOOGLE_CLOUD_PROJECT_ID=blociq-vision-ocr
DOCUMENT_AI_LOCATION=us
GOOGLE_CLOUD_API_KEY=your_api_key_here
```

### Step 3: Verify Setup

Test the setup by uploading a lease document to your application's OCR feature.

---

## Method 4: Service Account with Fixed Encoding

### Step 1: Re-encode Service Account JSON

If you want to try fixing the service account approach:

1. Download your service account JSON file
2. Encode it properly for Vercel:

```bash
# Method A: Base64 encode the entire file
cat your-service-account.json | base64 -w 0

# Method B: Escape the JSON for environment variable
cat your-service-account.json | jq -c . | sed 's/"/\\"/g'
```

3. Set in Vercel as `GOOGLE_APPLICATION_CREDENTIALS_JSON`

**Note**: This method often fails due to Vercel environment variable processing.

---

## Verification Steps

### Test Your Setup

1. **Check Authentication**:
   ```
   GET https://blociq.co.uk/api/setup-document-ai
   ```

2. **Create/Verify Processor**:
   ```
   POST https://blociq.co.uk/api/setup-document-ai
   ```

3. **Test OCR Pipeline**:
   Upload a lease document through your application

### Expected Environment Variables

For Method 1 (API Key - Recommended):
```
GOOGLE_CLOUD_API_KEY=AIza...
GOOGLE_CLOUD_PROJECT_ID=blociq-vision-ocr
DOCUMENT_AI_LOCATION=us
DOCUMENT_AI_PROCESSOR_ID=abc123def456  # After processor creation
```

---

## Troubleshooting

### API Key Issues
- Ensure API key has Document AI API enabled
- Check API restrictions aren't too restrictive
- Verify project ID matches your Google Cloud project

### Processor Creation Issues
- Ensure Document AI API is enabled in your project
- Check billing is enabled (Document AI requires billing)
- Verify you have Document AI Admin role

### OCR Pipeline Issues
- Test with small PDF files first (< 5MB)
- Check Vercel function timeout limits
- Monitor Vercel function logs for errors

---

## Security Best Practices

1. **API Key Security**:
   - Restrict API key to specific APIs
   - Consider IP restrictions for production
   - Rotate API keys periodically

2. **Environment Variables**:
   - Never commit API keys to code
   - Use different keys for development/production
   - Monitor usage in Google Cloud Console

---

## Contact Information

If you continue experiencing issues:
1. Check Vercel function logs
2. Review Google Cloud Console logs
3. Test authentication methods in order of preference:
   - API Key (Method 1) 
   - Manual processor + API Key (Method 3)
   - Access Token (Method 2)
   - Service Account (Method 4 - last resort)