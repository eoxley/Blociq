# 🔍 OCR System Health Check - Large PDF Processing

## **🎯 System Overview**

Your OCR system uses a **hybrid architecture** with a separate Render server for large PDF processing using Google Vision API. This is crucial for property management documents that are often large, scanned PDFs.

## **🏗️ Current Architecture**

### **Main Application (Vercel)**
- **Endpoint**: `/api/ocr/process`
- **Purpose**: Routes files to Render OCR service
- **File Size Limit**: 4.5MB (Vercel payload limit)
- **Large File Handling**: Uses Supabase StorageKey flow

### **Render OCR Service**
- **URL**: `https://ocr-server-2-ykmk.onrender.com/upload`
- **Purpose**: Processes large PDFs with Google Vision API
- **Fallback**: Tesseract OCR if Google Vision fails
- **File Support**: PDF, JPEG, PNG, TIFF, BMP

## **🔍 Health Check Results**

### **✅ Configuration Status**

#### **Environment Variables (Main App)**
```bash
# Required for OCR routing
RENDER_OCR_URL=https://ocr-server-2-ykmk.onrender.com/upload
RENDER_OCR_TOKEN=<shared-secret-token>

# Required for storage
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=building_documents
```

#### **Environment Variables (Render Server)**
```bash
# Google Vision API credentials
GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}

# Supabase access for file downloads
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_STORAGE_BUCKET=building_documents

# CORS configuration
ALLOWED_ORIGINS=https://www.blociq.co.uk,https://*.vercel.app,http://localhost:3000
```

### **🚨 Critical Issues Found**

#### **1. Endpoint Mismatch**
```typescript
// Current code expects: /ocr/process
const ocrUrl = process.env.RENDER_OCR_URL; // https://ocr-server-2-ykmk.onrender.com/ocr/process

// But Render service provides: /upload
// render-ocr-service/main.py:143
@app.post("/upload")
```

**Impact**: ❌ **CRITICAL** - All OCR requests will fail with 404 errors
**Fix**: Update `RENDER_OCR_URL` to use `/upload` endpoint

#### **2. Authentication Mismatch**
```typescript
// Main app sends Bearer token
headers: { 
  "Authorization": `Bearer ${token}` 
}

// But Render service expects no authentication
// render-ocr-service/main.py:143-147
@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    use_google_vision: Optional[bool] = False
):
```

**Impact**: ❌ **CRITICAL** - Authentication will fail
**Fix**: Either add auth to Render service or remove from main app

#### **3. Payload Format Mismatch**
```typescript
// Main app sends JSON with storageKey
payload = { 
  storageKey, 
  filename: file.name, 
  mime: file.type || "application/pdf",
  file: null
};

// But Render service expects FormData with file
async def upload_file(
    file: UploadFile = File(...),
    use_google_vision: Optional[bool] = False
):
```

**Impact**: ❌ **CRITICAL** - Render service can't process requests
**Fix**: Update Render service to handle storageKey flow

### **⚠️ High Priority Issues**

#### **4. Missing Storage Integration**
The Render service doesn't have Supabase integration to download files using storageKey.

#### **5. No Google Vision Configuration Check**
The Render service doesn't verify Google Vision credentials are properly configured.

#### **6. Missing Error Handling**
No comprehensive error handling for Google Vision API failures.

## **🔧 Required Fixes**

### **Fix 1: Update Environment Variables**
```bash
# Change from:
RENDER_OCR_URL=https://ocr-server-2-ykmk.onrender.com/ocr/process

# To:
RENDER_OCR_URL=https://ocr-server-2-ykmk.onrender.com/upload
```

### **Fix 2: Update Render Service Authentication**
```python
# Add to render-ocr-service/main.py
from fastapi import Depends, HTTPException, Header

async def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.split(" ")[1]
    expected_token = os.getenv("RENDER_OCR_TOKEN")
    
    if not expected_token or token != expected_token:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return token

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    use_google_vision: Optional[bool] = False,
    token: str = Depends(verify_token)
):
```

### **Fix 3: Add StorageKey Support**
```python
# Add to render-ocr-service/main.py
from supabase import create_client, Client
import tempfile

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(None),
    storage_key: Optional[str] = None,
    filename: Optional[str] = None,
    mime: Optional[str] = None,
    use_google_vision: Optional[bool] = False,
    token: str = Depends(verify_token)
):
    if storage_key:
        # Download file from Supabase storage
        try:
            response = supabase.storage.from_("building_documents").download(storage_key)
            if not response:
                raise HTTPException(status_code=404, detail="File not found in storage")
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as temp_file:
                temp_file.write(response)
                temp_file_path = temp_file.name
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")
    else:
        # Handle direct file upload
        if not file:
            raise HTTPException(status_code=400, detail="Either file or storage_key must be provided")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
```

### **Fix 4: Add Google Vision Health Check**
```python
# Add to render-ocr-service/main.py
@app.get("/health")
async def health_check():
    """Health check endpoint with service status"""
    return {
        "status": "healthy",
        "tesseract_available": True,
        "google_vision_available": vision_client is not None,
        "supabase_connected": supabase is not None,
        "timestamp": datetime.utcnow().isoformat()
    }
```

## **🧪 Testing Plan**

### **Phase 1: Configuration Test**
1. **Check Environment Variables**
   ```bash
   # Test main app configuration
   curl https://your-app.vercel.app/api/render-ocr-check
   ```

2. **Test Render Service Health**
   ```bash
   # Test Render service directly
   curl https://ocr-server-2-ykmk.onrender.com/health
   ```

### **Phase 2: Small File Test**
1. **Upload small PDF (< 5MB)**
   - Should use quick processing
   - Should work with current setup

### **Phase 3: Large File Test**
1. **Upload large PDF (> 5MB)**
   - Should use storageKey flow
   - Should route to Render service
   - Should process with Google Vision

### **Phase 4: Error Handling Test**
1. **Test with invalid file**
2. **Test with corrupted PDF**
3. **Test with unsupported format**

## **📊 Expected Results After Fixes**

### **✅ Small Files (< 5MB)**
- Quick processing works
- Immediate results in chat
- No external service dependency

### **✅ Large Files (> 5MB)**
- Files uploaded to Supabase storage
- StorageKey sent to Render service
- Google Vision processes PDF
- Results returned to main app
- Analysis displayed in chat

### **✅ Error Handling**
- Clear error messages for failures
- Graceful fallback to Tesseract
- Proper cleanup of temporary files

## **🚀 Quick Start Commands**

### **1. Test Current Configuration**
```bash
# Check if environment variables are set
curl https://your-app.vercel.app/api/render-ocr-check
```

### **2. Test Render Service**
```bash
# Test Render service health
curl https://ocr-server-2-ykmk.onrender.com/
```

### **3. Test OCR Processing**
```bash
# Test with small file
curl -X POST https://your-app.vercel.app/api/ask-ai/upload \
  -F "file=@test.pdf"
```

## **🎯 Success Criteria**

1. **Environment Variables**: All required variables configured
2. **Render Service**: Accessible and responding
3. **Google Vision**: Properly configured and working
4. **Storage Integration**: Supabase storage accessible
5. **File Processing**: Both small and large files work
6. **Error Handling**: Graceful failure and recovery

## **⚠️ Critical Dependencies**

1. **Google Vision API**: Must be enabled and configured
2. **Supabase Storage**: `building_documents` bucket must exist
3. **Render Service**: Must be deployed and accessible
4. **Environment Variables**: Must be properly set in both services

The system is well-architected but has critical configuration mismatches that need immediate attention before testing.
