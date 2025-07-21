# Outlook Integration Setup Guide

## 🔧 **Environment Variables Required**

Add these to your `.env.local` file:

```bash
# Microsoft Graph API Configuration
OUTLOOK_CLIENT_ID=your_microsoft_app_client_id
OUTLOOK_CLIENT_SECRET=your_microsoft_app_client_secret
OUTLOOK_REDIRECT_URI=https://your-domain.com/api/auth/outlook/callback
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# For local development, use:
# OUTLOOK_REDIRECT_URI=http://localhost:3000/api/auth/outlook/callback
# NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 📋 **Step-by-Step Setup**

### 1. **Microsoft Azure App Registration**

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name:** BlocIQ Outlook Integration
   - **Supported account types:** Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI:** 
     - **Type:** Web
     - **URL:** `https://your-domain.com/api/auth/outlook/callback`
     - **For local development:** `http://localhost:3000/api/auth/outlook/callback`

### 2. **Configure API Permissions**

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add these permissions:
   - `Calendars.ReadWrite`
   - `Mail.Read`
   - `offline_access`
6. Click **Grant admin consent**

### 3. **Get Client Credentials**

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description and choose expiry
4. **Copy the secret value** (you won't see it again!)
5. Go to **Overview** and copy the **Application (client) ID**

### 4. **Update Environment Variables**

Replace the placeholders in your `.env.local`:

```bash
OUTLOOK_CLIENT_ID=your_copied_client_id_here
OUTLOOK_CLIENT_SECRET=your_copied_secret_value_here
OUTLOOK_REDIRECT_URI=https://your-domain.com/api/auth/outlook/callback
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## 🚀 **Testing the Setup**

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Test the environment variables:**
   - Visit: `http://localhost:3000/api/test-env`
   - Should show ✅ for all Outlook variables

3. **Test the OAuth flow:**
   - Visit: `http://localhost:3000/api/auth/outlook`
   - Should redirect to Microsoft login

## 🔍 **Troubleshooting**

### **Common Issues:**

1. **"Redirect URI mismatch"**
   - Ensure the redirect URI in Azure matches exactly
   - Check for trailing slashes or typos

2. **"Invalid client"**
   - Verify `OUTLOOK_CLIENT_ID` is correct
   - Check that the app is properly registered

3. **"Invalid client secret"**
   - Ensure `OUTLOOK_CLIENT_SECRET` is the current secret
   - Generate a new secret if needed

4. **"Insufficient permissions"**
   - Grant admin consent for the API permissions
   - Ensure all required permissions are added

### **Production Deployment:**

For production, update the redirect URI to your actual domain:

```bash
OUTLOOK_REDIRECT_URI=https://your-actual-domain.com/api/auth/outlook/callback
NEXT_PUBLIC_SITE_URL=https://your-actual-domain.com
```

## 📞 **Support**

If you encounter issues:
1. Check the browser console for errors
2. Check the server logs for detailed error messages
3. Verify all environment variables are set correctly
4. Ensure the Azure app registration is properly configured 