# 🚀 Render OCR Service Setup Guide

## **📋 Overview**

This guide sets up the Render OCR service with Google Vision API integration for processing large PDF documents in your property management system.

## **🔧 Required Environment Variables**

### **Render Service Environment Variables**

Set these in your Render dashboard under "Environment":

```bash
# Authentication (Required)
RENDER_OCR_TOKEN=your-shared-secret-token-here

# Google Vision API (Required for PDF processing)
GOOGLE_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----","client_email":"your-service@project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/your-service%40your-project.iam.gserviceaccount.com"}

# Supabase Integration (Required for large file processing)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_STORAGE_BUCKET=building_documents

# CORS Configuration (Required)
ALLOWED_ORIGINS=https://www.blociq.co.uk,https://*.vercel.app,http://localhost:3000

# Optional: Port configuration
PORT=8000
```

### **Main App Environment Variables**

Set these in your Vercel dashboard:

```bash
# Render OCR Service Integration
RENDER_OCR_URL=https://your-render-service.onrender.com/upload
RENDER_OCR_TOKEN=your-shared-secret-token-here

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=building_documents
```

## **🔑 Google Vision API Setup**

### **1. Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Vision API:
   ```bash
   gcloud services enable vision.googleapis.com
   ```

### **2. Create Service Account**
1. Go to IAM & Admin → Service Accounts
2. Click "Create Service Account"
3. Name: `blociq-ocr-service`
4. Description: `OCR service for BlocIQ property management`
5. Click "Create and Continue"

### **3. Grant Permissions**
1. Add role: `Cloud Vision API User`
2. Click "Continue" → "Done"

### **4. Create Service Account Key**
1. Click on the service account
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON" format
5. Download the key file

### **5. Configure Environment Variable**
1. Open the downloaded JSON file
2. Copy the entire JSON content
3. Set as `GOOGLE_CREDENTIALS_JSON` in Render dashboard
4. **Important**: Keep the JSON as a single line with escaped quotes

## **🗄️ Supabase Storage Setup**

### **1. Create Storage Bucket**
1. Go to your Supabase dashboard
2. Navigate to Storage
3. Click "New bucket"
4. Name: `building_documents`
5. Make it public: **No** (for security)
6. Click "Create bucket"

### **2. Set Bucket Policies**
1. Go to Storage → Policies
2. Create policy for `building_documents` bucket:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'building_documents' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to download files
CREATE POLICY "Users can download files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'building_documents' AND
  auth.role() = 'authenticated'
);

-- Allow service role to access all files
CREATE POLICY "Service role can access all files" ON storage.objects
FOR ALL USING (
  bucket_id = 'building_documents' AND
  auth.role() = 'service_role'
);
```

## **🚀 Deployment Steps**

### **1. Deploy to Render**
1. Connect your GitHub repository to Render
2. Create a new "Web Service"
3. Choose the `render-ocr-service` directory
4. Set environment variables (see above)
5. Deploy

### **2. Update Main App**
1. Set `RENDER_OCR_URL` to your deployed service URL
2. Set `RENDER_OCR_TOKEN` to match the Render service
3. Deploy to Vercel

## **🧪 Testing the Service**

### **1. Health Check**
```bash
# Test basic health
curl https://your-render-service.onrender.com/

# Test detailed health
curl https://your-render-service.onrender.com/health
```

### **2. Test OCR Processing**
```bash
# Test with small file
curl -X POST https://your-render-service.onrender.com/upload \
  -H "Authorization: Bearer your-token" \
  -F "file=@test.pdf" \
  -F "use_google_vision=true"

# Test with storage key (large file)
curl -X POST https://your-render-service.onrender.com/upload \
  -H "Authorization: Bearer your-token" \
  -F "storage_key=path/to/file.pdf" \
  -F "filename=test.pdf" \
  -F "mime=application/pdf" \
  -F "use_google_vision=true"
```

### **3. Test from Main App**
```bash
# Test OCR endpoint
curl https://your-app.vercel.app/api/render-ocr-check
```

## **📊 Expected Response Format**

### **Health Check Response**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-17T10:30:00.000Z",
  "services": {
    "tesseract_available": true,
    "google_vision_available": true,
    "supabase_available": true,
    "supabase_imported": true
  },
  "environment": {
    "google_credentials_configured": true,
    "supabase_url_configured": true,
    "supabase_key_configured": true,
    "render_token_configured": true
  }
}
```

### **OCR Processing Response**
```json
{
  "success": true,
  "text": "Extracted text content...",
  "source": "google-vision",
  "filename": "document.pdf",
  "content_type": "application/pdf",
  "text_length": 1234,
  "processing_mode": "storage_key"
}
```

## **🔍 Troubleshooting**

### **Common Issues**

#### **1. Google Vision Not Available**
- Check `GOOGLE_CREDENTIALS_JSON` is properly formatted
- Verify the service account has Vision API permissions
- Check the project has Vision API enabled

#### **2. Supabase Connection Failed**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check the storage bucket exists
- Verify bucket policies allow service role access

#### **3. Authentication Failed**
- Ensure `RENDER_OCR_TOKEN` matches between main app and Render service
- Check the token is not expired or corrupted

#### **4. File Not Found in Storage**
- Verify the storage key is correct
- Check the file exists in the `building_documents` bucket
- Ensure the service role has access to the file

### **Debug Commands**

```bash
# Check Render service logs
# Go to Render dashboard → Your service → Logs

# Test individual components
curl -H "Authorization: Bearer your-token" https://your-render-service.onrender.com/health

# Test with verbose output
curl -v -X POST https://your-render-service.onrender.com/upload \
  -H "Authorization: Bearer your-token" \
  -F "file=@test.pdf"
```

## **💰 Cost Considerations**

### **Google Vision API Pricing**
- **Text Detection**: $1.50 per 1,000 images
- **PDF Processing**: Each page counts as one image
- **Free Tier**: 1,000 images per month

### **Render Hosting**
- **Starter Plan**: $7/month
- **Sleep Mode**: Service sleeps after 15 minutes of inactivity
- **Cold Start**: ~30 seconds to wake up

### **Optimization Tips**
1. Use Google Vision for PDFs (better accuracy)
2. Use Tesseract for simple images (lower cost)
3. Implement caching for repeated documents
4. Consider batch processing for multiple files

## **🔒 Security Considerations**

1. **Token Security**: Use strong, unique tokens
2. **CORS Configuration**: Restrict to your domains only
3. **File Validation**: Validate file types and sizes
4. **Rate Limiting**: Consider implementing rate limits
5. **Logging**: Monitor for suspicious activity

## **📈 Monitoring**

### **Key Metrics to Monitor**
1. **Response Time**: OCR processing duration
2. **Success Rate**: Percentage of successful extractions
3. **Error Rate**: Failed requests and error types
4. **Cost**: Google Vision API usage and costs
5. **Uptime**: Service availability

### **Recommended Alerts**
1. Service down for > 5 minutes
2. Error rate > 10%
3. Response time > 60 seconds
4. Google Vision API quota exceeded

The service is now ready for deployment and testing!
