# Outlook Add-in Reinstallation Guide

## ✅ FIXED: Manifest URLs Updated for Frontend Migration

The Outlook add-in manifest has been successfully updated to point to the frontend URLs. Follow these steps to reinstall the add-in in Outlook.

## Current Status:
- ✅ **Manifest Updated**: All URLs now point to `https://blociq-frontend.vercel.app`
- ✅ **Assets Available**: Icon files copied to `public/outlook-addin/`  
- ✅ **Add-in Page Ready**: `/outlook-addin` page with chat and reply functionality
- ✅ **Headers Configured**: Next.js configured with proper CORS and CSP headers

## Files Updated:

### 1. Manifest File: `/public/outlook-addin/manifest.xml`
Updated all URLs from old backend to frontend:
- `IconUrl`: `https://blociq-frontend.vercel.app/outlook-addin/icon-32.png`
- `HighResolutionIconUrl`: `https://blociq-frontend.vercel.app/outlook-addin/icon-80.png`
- `SourceLocation`: `https://blociq-frontend.vercel.app/outlook-addin`
- `AppDomain`: `https://blociq-frontend.vercel.app`

### 2. Assets Available:
- `/public/outlook-addin/icon-16.png` ✅
- `/public/outlook-addin/icon-32.png` ✅  
- `/public/outlook-addin/icon-80.png` ✅
- `/public/outlook-addin/manifest.xml` ✅

### 3. Add-in Functionality:
- `/app/outlook-addin/page.tsx` - Main add-in interface ✅
- Chat functionality with AI responses ✅
- Generate Reply modal with email context ✅
- Automatic email reading and context awareness ✅

## Reinstallation Steps:

### Step 1: Remove Old Add-in
1. **Open Outlook** (desktop, web, or mobile)
2. **Go to Add-ins**:
   - **Outlook Desktop**: Home tab → Get Add-ins → Manage Add-ins
   - **Outlook Web**: Settings (gear icon) → Mail → General → Manage add-ins
3. **Find BlocIQ Assistant** in your installed add-ins
4. **Remove/Uninstall** the old add-in completely

### Step 2: Install Updated Add-in

#### Option A: Direct Manifest Upload (Recommended)
1. **Download the updated manifest**: Use `/public/outlook-addin/manifest.xml`
2. **Upload to Outlook**:
   - Go to **Get Add-ins** → **My add-ins** → **Add a custom add-in** → **Add from file**
   - Select the updated `manifest.xml` file
   - Click **Install**

#### Option B: Manual Configuration (if manifest upload fails)
1. Go to **My add-ins** → **Add a custom add-in** → **Add from URL**
2. Enter: `https://blociq-frontend.vercel.app/outlook-addin/manifest.xml`
3. Click **Install**

### Step 3: Verify Installation
1. **Open an email** in Outlook
2. **Look for BlocIQ AI Assistant** in:
   - **Ribbon**: "BlocIQ AI" group with "AI Assistant" button
   - **Add-in panel**: Should appear in sidebar or as popup
3. **Click the add-in** to open
4. **Verify functionality**:
   - Add-in loads with email context
   - Chat responds to messages  
   - "Generate AI Reply" button works
   - AI can analyze current email

### Step 4: Test Key Features
1. **Ask AI about the email**: "What type of email is this?"
2. **Generate reply**: Click "Generate AI Reply" → Choose tone → Generate
3. **Save draft**: Generated reply should save to Outlook drafts
4. **Chat functionality**: Ask questions like "Help me draft a response"

## Troubleshooting:

### Issue: Add-in doesn't appear after installation
**Solution**: 
- Check Outlook permissions and refresh
- Try removing and reinstalling 
- Clear Outlook cache and restart

### Issue: Add-in shows "Page not found" 
**Solution**:
- Verify the frontend is deployed to Vercel
- Check URL: `https://blociq-frontend.vercel.app/outlook-addin`
- Ensure SSL certificate is valid

### Issue: Add-in loads but functionality doesn't work
**Solution**:
- Check browser console for JavaScript errors
- Verify API endpoints are accessible
- Check network connectivity and CORS headers

### Issue: "Generate Reply" button doesn't work
**Solution**:
- Ensure Office.js is loaded properly
- Check if email context is being read
- Verify AI API endpoints are responding

## Configuration Details:

### Supported Outlook Versions:
- Outlook Desktop (Windows/Mac)
- Outlook Web App (Office 365)
- Outlook Mobile (limited support)

### Required Permissions:
- `ReadWriteMailbox` - Allows reading and creating email drafts

### Security Features:
- CSP headers allow Office.com domains only
- CORS configured for Outlook endpoints
- No third-party domains in manifest

## Deployment URLs:

### Production (Replace with actual deployment URL):
```
Main URL: https://blociq-frontend.vercel.app
Add-in Page: https://blociq-frontend.vercel.app/outlook-addin
Manifest: https://blociq-frontend.vercel.app/outlook-addin/manifest.xml
Icons: https://blociq-frontend.vercel.app/outlook-addin/icon-*.png
```

### Development (for testing):
```
Main URL: http://localhost:3000
Add-in Page: http://localhost:3000/outlook-addin  
Manifest: http://localhost:3000/outlook-addin/manifest.xml
```

## Expected Results After Installation:

✅ **Add-in appears** in Outlook ribbon/sidebar  
✅ **Add-in loads** frontend interface without errors  
✅ **Email context** automatically detected and displayed  
✅ **Chat functionality** responds to user messages  
✅ **AI reply generation** creates contextual email responses  
✅ **Draft saving** works directly in Outlook  
✅ **All features** work seamlessly in Outlook environment  

## Support:
If issues persist after following these steps:
1. Check browser developer console for errors
2. Verify network connectivity to `blociq-frontend.vercel.app`  
3. Test the add-in page directly in browser first
4. Contact development team with specific error messages

---
**Status**: ✅ Ready for reinstallation  
**Updated**: August 31, 2025  
**Migration**: Backend → Frontend Complete