# 🔧 Outlook Calendar Integration Fix

## **🚨 Problem Identified**

**Error**: `AADSTS700016: Application with identifier '4ab4eae8-71e3-462b-ab41-a754b48d8839' was not found in the directory 'Bloc IQ LTD'`

**Root Cause**: Your environment is using the wrong Microsoft App ID. The error shows `4ab4eae8-71e3-462b-ab41-a754b48d8839`, but your configuration expects `03d6ee20-cbe3-4d98-867c-084b0419fd96`.

## **🎯 Solution Steps**

### **Step 1: Check Current Environment Variables**

First, let's verify what's currently configured in your Vercel environment:

1. Go to your Vercel dashboard
2. Navigate to your project → Settings → Environment Variables
3. Check these variables:
   - `MICROSOFT_CLIENT_ID`
   - `OUTLOOK_CLIENT_ID` 
   - `NEXT_PUBLIC_MICROSOFT_CLIENT_ID`

**Expected**: All should be `03d6ee20-cbe3-4d98-867c-084b0419fd96`
**Actual**: One or more is probably `4ab4eae8-71e3-462b-ab41-a754b48d8839`

### **Step 2: Update Environment Variables in Vercel**

Set ALL these to the correct value:

```bash
MICROSOFT_CLIENT_ID=03d6ee20-cbe3-4d98-867c-084b0419fd96
OUTLOOK_CLIENT_ID=03d6ee20-cbe3-4d98-867c-084b0419fd96
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=03d6ee20-cbe3-4d98-867c-084b0419fd96
```

### **Step 3: Verify Azure App Registration**

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Look for an app with ID `03d6ee20-cbe3-4d98-867c-084b0419fd96`
4. If it doesn't exist, you need to create it (see Step 4)
5. If it exists, verify the redirect URIs include:
   - `https://www.blociq.co.uk/api/auth/outlook/callback`
   - `https://blociq-h3xv.vercel.app/api/auth/outlook/callback`

### **Step 4: Create Azure App Registration (if needed)**

If the app `03d6ee20-cbe3-4d98-867c-084b0419fd96` doesn't exist:

1. **Create New Registration**:
   - Name: "BlocIQ Property Management"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: Web - `https://www.blociq.co.uk/api/auth/outlook/callback`

2. **Configure API Permissions**:
   - Microsoft Graph → Delegated permissions:
     - `openid`
     - `profile`
     - `email`
     - `offline_access`
     - `Mail.Read`
     - `Mail.Send`
     - `Calendars.Read`
     - `Calendars.ReadWrite`

3. **Generate Client Secret**:
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Copy the **VALUE** (not the Secret ID)
   - Update `MICROSOFT_CLIENT_SECRET` in Vercel

4. **Get Application ID**:
   - Copy the "Application (client) ID" from Overview
   - This should be `03d6ee20-cbe3-4d98-867c-084b0419fd96`

### **Step 5: Test the Fix**

1. **Redeploy your application** (Vercel will pick up the new environment variables)
2. **Clear browser cache** and cookies
3. **Try connecting Outlook again**:
   - Go to your app
   - Click "Connect Outlook" or similar
   - Complete the OAuth flow

### **Step 6: Verify the Fix**

After completing the OAuth flow, check:

1. **Browser Network Tab**: Look for requests to `outlook_tokens` API
2. **Should see**: 200 status instead of 406
3. **Database**: Check if `outlook_tokens` table has new entries
4. **Console**: No more authentication errors

## **🔍 Troubleshooting**

### **If you still get AADSTS700016:**

1. **Check the OAuth URL**: When you click "Connect Outlook", look at the URL in your browser
2. **Should contain**: `client_id=03d6ee20-cbe3-4d98-867c-084b0419fd96`
3. **If it shows**: `client_id=4ab4eae8-71e3-462b-ab41-a754b48d8839` → environment variables not updated

### **If you get "Application not found":**

1. **Verify the app exists** in Azure Portal
2. **Check tenant**: Make sure you're in the correct Azure AD tenant
3. **Check permissions**: Ensure the app has the required API permissions

### **If you get "Invalid client secret":**

1. **Regenerate the secret** in Azure Portal
2. **Update `MICROSOFT_CLIENT_SECRET`** in Vercel
3. **Redeploy** the application

## **📋 Quick Checklist**

- [ ] All environment variables use `03d6ee20-cbe3-4d98-867c-084b0419fd96`
- [ ] Azure app registration exists with correct ID
- [ ] Redirect URIs are configured correctly
- [ ] Client secret is generated and updated in Vercel
- [ ] Application is redeployed
- [ ] Browser cache is cleared
- [ ] OAuth flow completes successfully

## **🎯 Expected Result**

After completing these steps:
- ✅ Outlook calendar integration should work
- ✅ No more AADSTS700016 errors
- ✅ No more 406 errors on `outlook_tokens` API
- ✅ Calendar events should sync properly
