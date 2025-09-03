# 🔧 Outlook Authentication Fix - Step-by-Step Guide

## 🎯 **Problem Identified**
Your system is using mixed Azure app IDs:
- ❌ **Old App**: `f8033f58-1b3b-40a7-8f0c-86678499cc74` (causing AADSTS7000215)
- ✅ **New App**: `4ab4eae8-71e3-462b-ab41-a754b48d8839` (should be used everywhere)

## 📋 **Step-by-Step Fix (Do in Order)**

### **Step 1: Unify Environment Variables in Vercel**

Set ALL these to the **same value**: `4ab4eae8-71e3-462b-ab41-a754b8d8839`

```bash
# In Vercel Dashboard → Settings → Environment Variables
OUTLOOK_CLIENT_ID=4ab4eae8-71e3-462b-ab41-a754b48d8839
MICROSOFT_CLIENT_ID=4ab4eae8-71e3-462b-ab41-a754b48d8839
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=4ab4eae8-71e3-462b-ab41-a754b48d8839

# Keep duplicates for now - ensures both frontend & backend use same ID
```

### **Step 2: Generate New Client Secret**

1. **Go to Azure Portal**: https://portal.azure.com
2. **Navigate to**: App registrations → "BlocIQ AI Assistant" → Certificates & secrets
3. **Click**: "New client secret"
4. **Description**: "BlocIQ Production Secret 2025"
5. **Expires**: 24 months (recommended)
6. **Copy the VALUE** (not the Secret ID!)

### **Step 3: Update Client Secret in Vercel**

```bash
# In Vercel Dashboard → Settings → Environment Variables
MICROSOFT_CLIENT_SECRET=<your_new_secret_value>
OUTLOOK_CLIENT_SECRET=<your_new_secret_value>
```

### **Step 4: Verify Redirect URIs in Azure**

Ensure these are added in Azure → App registrations → Redirect URIs:

```
✅ https://www.blociq.co.uk/api/auth/outlook/callback
✅ https://blociq-h3xv.vercel.app/api/auth/outlook/callback  
✅ http://localhost:3000/api/auth/outlook/callback
```

### **Step 5: Use Tenant-Specific Endpoints (Optional)**

If you have hardcoded auth URLs, update them to:

```javascript
// Instead of /common, use your specific tenant:
const AUTH_URL = 'https://login.microsoftonline.com/6c00dc8f-a9ab-4339-a17d-437869997312/oauth2/v2.0/authorize'
const TOKEN_URL = 'https://login.microsoftonline.com/6c00dc8f-a9ab-4339-a17d-437869997312/oauth2/v2.0/token'
```

### **Step 6: Deploy Changes**

```bash
# Redeploy so both server & client pick up new environment variables
git push origin main
# or trigger manual deployment in Vercel
```

### **Step 7: Purge Old Tokens**

**⚠️ Critical**: Delete existing tokens tied to the old app:

```sql
-- In Supabase SQL Editor:
DELETE FROM outlook_tokens WHERE user_id = '<your_user_id>';

-- Or delete all tokens to force everyone to reconnect:
DELETE FROM outlook_tokens;
```

### **Step 8: Test Reconnection**

1. **In your app**: Click "Disconnect Outlook" → "Connect Outlook"
2. **Check the consent URL** - should show: `client_id=4ab4eae8-71e3-462b-ab41-a754b48d8839`
3. **If you still see** `f803...` → something is cached/hardcoded

### **Step 9: Verify Required Scopes**

Ensure these scopes are granted in Azure → API permissions:

```
✅ openid
✅ profile  
✅ email
✅ offline_access
✅ Mail.Read
✅ Mail.Send
✅ Calendars.Read
✅ Calendars.ReadWrite
```

## 🔍 **Verification Commands**

### Check Environment Variables
```bash
# In your app, visit: /api/check-env
# Should show all client IDs as: 4ab4eae8-71e3-462b-ab41-a754b48d8839
```

### Check for Hardcoded IDs
```bash
# Run in your project root:
grep -r "f8033f58" .
grep -r "f803" .
# Should return no results
```

### Test Token Refresh
```bash
# After reconnecting, check console logs during token refresh
# Should show successful refresh without AADSTS7000215
```

## 🎯 **Expected Results**

### ✅ **Before Fix**
- ❌ AADSTS7000215: Invalid client secret
- ❌ Token refresh failed  
- ❌ "Your Outlook session has expired"

### ✅ **After Fix**
- ✅ Successful token refresh
- ✅ No AADSTS errors
- ✅ Outlook calendar/email sync working
- ✅ All client IDs unified

## 🚨 **Troubleshooting**

### If you still get AADSTS7000215:
1. **Double-check**: All environment variables use `4ab4eae8-71e3-462b-ab41-a754b48d8839`
2. **Verify**: Client secret is the VALUE, not the Secret ID
3. **Confirm**: You've deleted old tokens from database
4. **Redeploy**: Both frontend and backend have new environment variables

### If consent URL shows wrong client_id:
1. **Clear browser cache** and cookies
2. **Check**: `NEXT_PUBLIC_MICROSOFT_CLIENT_ID` in Vercel
3. **Restart**: Your development server if testing locally

### If redirect URI mismatch:
1. **Add all variants** in Azure (production, staging, localhost)
2. **Match exactly**: Case-sensitive, no trailing slashes

## 📝 **Quick Summary**

1. ✅ Set all client IDs to: `4ab4eae8-71e3-462b-ab41-a754b48d8839`
2. ✅ Generate new client secret and update in Vercel  
3. ✅ Verify redirect URIs in Azure
4. ✅ Deploy changes
5. ✅ Delete old tokens from database
6. ✅ Test reconnection

This should completely resolve the AADSTS7000215 error and restore Outlook functionality! 🚀
