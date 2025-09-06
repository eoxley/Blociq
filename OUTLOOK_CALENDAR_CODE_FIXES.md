# 🔧 Outlook Calendar Code Fixes Applied

## **🎯 Problem Solved**

**Error**: `AADSTS700016: Application with identifier '4ab4eae8-71e3-462b-ab41-a754b48d8839' was not found in the directory 'Bloc IQ LTD'`

**Root Cause**: Hardcoded Microsoft OAuth URLs using `/common/` endpoint and inconsistent environment variable usage.

## **✅ Code Changes Applied**

### **1. Fixed Hardcoded OAuth URLs**

**Files Updated:**
- `app/outlook/connect/page.tsx` - Removed hardcoded OAuth URL, now uses API route
- `lib/outlookUtils.ts` - Added tenant-specific URL support
- `app/api/outlook/callback/route.ts` - Added tenant-specific token URL
- `lib/outlookAuth.ts` - Added tenant-specific token URL
- `app/api/connect-outlook/route.ts` - Added tenant-specific auth URL
- `app/auth/sign-in/route.ts` - Added tenant-specific auth URL
- `lib/outlook.ts` - Added tenant-specific token URL
- `app/api/add-to-calendar/route.ts` - Added tenant-specific token URL

### **2. Key Changes Made**

#### **Before (Problematic):**
```javascript
// Hardcoded /common/ endpoint
const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}...`;

// Hardcoded /common/ token endpoint
const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
```

#### **After (Fixed):**
```javascript
// Dynamic tenant-specific endpoint
const tenantId = process.env.AZURE_TENANT_ID || 'common';
const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}...`;

// Dynamic tenant-specific token endpoint
const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
```

### **3. Environment Variable Consistency**

All files now consistently use:
- `MICROSOFT_CLIENT_ID` for server-side operations
- `NEXT_PUBLIC_MICROSOFT_CLIENT_ID` for client-side operations
- `AZURE_TENANT_ID` for tenant-specific endpoints (falls back to 'common')

## **🚀 Expected Results**

After these code changes:

1. **Correct App ID Usage**: All OAuth flows will use the correct App ID from environment variables
2. **Tenant-Specific Endpoints**: OAuth URLs will use your specific Azure tenant instead of `/common/`
3. **Consistent Configuration**: All Microsoft OAuth operations use the same environment variables
4. **No More AADSTS700016**: The error should be resolved as the correct App ID will be used

## **🔍 How This Fixes the Issue**

1. **Removed Hardcoded URLs**: The `app/outlook/connect/page.tsx` was using a hardcoded OAuth URL that might have been using the wrong App ID
2. **Added Tenant Support**: All OAuth URLs now use your specific Azure tenant ID instead of `/common/`
3. **Consistent Environment Variables**: All files now use the same environment variable names
4. **Centralized OAuth Flow**: The connect page now uses the API route which has proper error handling and logging

## **📋 Next Steps**

1. **Deploy the changes** to your Vercel/Render environment
2. **Test the Outlook connection** by clicking "Connect Outlook" in your app
3. **Check the OAuth URL** in your browser - it should now contain the correct App ID
4. **Verify the connection** works without the AADSTS700016 error

## **🧪 Testing**

To verify the fix:

1. Go to your app and click "Connect Outlook"
2. Check the OAuth URL in your browser address bar
3. Should contain: `client_id=03d6ee20-cbe3-4d98-867c-084b0419fd96`
4. Should NOT contain: `client_id=4ab4eae8-71e3-462b-ab41-a754b48d8839`
5. Complete the OAuth flow - should work without errors

## **✅ Success Indicators**

- ✅ No more AADSTS700016 error
- ✅ OAuth flow completes successfully
- ✅ Outlook calendar integration works
- ✅ No more 406 errors on `outlook_tokens` API
- ✅ Calendar events sync properly

The code changes ensure that your application uses the correct Microsoft App ID and tenant-specific endpoints, which should resolve the authentication error you were experiencing.
