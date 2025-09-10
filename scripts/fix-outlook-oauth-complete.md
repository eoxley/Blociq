# Complete Outlook OAuth Fix

## 🚨 **Root Cause Identified**

The issue was that there are **two different OAuth flows** in the application:

1. **Microsoft Sign-in** (`/auth/sign-in`) - was using hardcoded `/auth/callback`
2. **Outlook Calendar Sync** (`/api/auth/outlook`) - uses `/api/auth/outlook/callback`

The user was trying to connect Outlook calendar, but the system was redirecting to the Microsoft sign-in flow which had the wrong redirect URI.

## ✅ **Fix Applied**

### **1. Updated Hardcoded Redirect URI**
- **File**: `app/auth/sign-in/route.ts`
- **Changed**: `https://www.blociq.co.uk/auth/callback` → `https://www.blociq.co.uk/api/auth/outlook/callback`
- **Reason**: Both OAuth flows now use the same redirect URI

### **2. Azure Portal Configuration Required**

You need to add the additional redirect URI to your Azure Portal app registration:

**Current URIs in Azure Portal:**
- ✅ `http://localhost:3000/api/auth/outlook/callback`
- ✅ `https://www.blociq.co.uk/api/auth/outlook/callback`

**Additional URI to Add:**
- ✅ `https://www.blociq.co.uk/auth/callback` (for Microsoft sign-in flow)

## 🔧 **Steps to Complete the Fix**

### **Step 1: Update Azure Portal**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your app with Client ID: `03d6ee20-cbe3-4d98-867c-084b0419fd96`
4. Go to **Authentication** → **Redirect URIs**
5. **Add** `https://www.blociq.co.uk/auth/callback`
6. **Save** changes

### **Step 2: Test the Fix**
1. Try connecting Outlook calendar again
2. The OAuth flow should now work correctly
3. Both Microsoft sign-in and Outlook calendar sync will use the same redirect URI

## 📋 **Final Redirect URIs in Azure Portal**

After the fix, you should have these URIs:
- `http://localhost:3000/api/auth/outlook/callback` (local development)
- `https://www.blociq.co.uk/api/auth/outlook/callback` (production - Outlook calendar)
- `https://www.blociq.co.uk/auth/callback` (production - Microsoft sign-in)

## ✅ **Expected Result**

- ✅ **Outlook calendar connection will work**
- ✅ **Microsoft sign-in will work**
- ✅ **No more redirect URI mismatch errors**
- ✅ **Both OAuth flows use consistent redirect URIs**

## 🎯 **Why This Fixes It**

The error occurred because:
1. User clicked "Connect Outlook" 
2. System redirected to `/auth/sign-in` (Microsoft sign-in)
3. Microsoft sign-in used hardcoded `/auth/callback` redirect URI
4. Azure Portal didn't have `/auth/callback` registered
5. Microsoft OAuth service rejected the request

Now both flows use the same redirect URI that's properly registered in Azure Portal.
