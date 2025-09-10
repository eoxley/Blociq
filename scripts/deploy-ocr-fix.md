# 🔧 OCR Service Fix - Deployment Guide

## ✅ **What We Fixed**

1. **Environment Variable Name**: Changed `NEXT_PUBLIC_SUPABASE_URL` to `SUPABASE_URL`
2. **Supabase Version**: Downgraded from 2.3.0 to 2.0.2 (more stable)
3. **Health Check**: Updated to check correct environment variable

## 🚀 **Deployment Steps**

### **Option 1: Deploy via Render Dashboard (Recommended)**

1. **Go to Render Dashboard**
   - Navigate to [render.com](https://render.com)
   - Find your service: `ocr-server-2-ykmk`

2. **Deploy the Fixed Code**
   - Go to **"Manual Deploy"** tab
   - Click **"Deploy latest commit"**
   - Wait 2-3 minutes for deployment

3. **Test the Fix**
   - Check health endpoint: `https://ocr-server-2-ykmk.onrender.com/health`
   - Should now show `"supabase_available": true`

### **Option 2: Deploy via Git (If Connected)**

1. **Commit the Changes**
   ```bash
   cd render-ocr-service
   git add .
   git commit -m "Fix Supabase connection - use SUPABASE_URL instead of NEXT_PUBLIC_SUPABASE_URL"
   git push origin main
   ```

2. **Render will Auto-Deploy**
   - Render will automatically detect the changes
   - Wait for deployment to complete

## 🎯 **Expected Result**

After deployment, the health check should show:
```json
{
  "status": "healthy",
  "services": {
    "tesseract_available": true,
    "google_vision_available": true,
    "supabase_available": true,  // ← This should now be true
    "supabase_imported": true
  },
  "environment": {
    "supabase_url_configured": true,
    "supabase_key_configured": true,
    "render_token_configured": true
  }
}
```

## 🔍 **Test the OCR Functionality**

1. **Upload a Lease Document**
   - Go to your BlocIQ lease analysis page
   - Upload a PDF document
   - OCR should now work without 404 errors

2. **Check for Success**
   - Document should process successfully
   - Text should be extracted and displayed
   - No more "OCR service failed: 404" errors

## 🆘 **If Still Not Working**

1. **Check Render Logs**
   - Go to Render Dashboard > Logs tab
   - Look for any remaining Supabase errors

2. **Verify Environment Variables**
   - Make sure Render has these exact variables:
     - `SUPABASE_URL=https://xqxaatvykmaaynqeoemy.supabase.co`
     - `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`
     - `SUPABASE_STORAGE_BUCKET=building_documents`

3. **Contact Support**
   - If issues persist, the problem might be with Render's network connectivity to Supabase

## ✅ **Summary**

The main issue was that the OCR service was looking for `NEXT_PUBLIC_SUPABASE_URL` (client-side variable) instead of `SUPABASE_URL` (server-side variable). This fix should resolve the Supabase connection issue!
