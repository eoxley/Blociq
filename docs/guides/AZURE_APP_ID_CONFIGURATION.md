# Azure App ID Configuration

## 🎯 **App ID Assignments**

### **Main Web Application - "Bloc IQ LTD"**
```
App ID: 03d6ee20-cbe3-4d98-867c-084b0419fd96
Usage: Main BlocIQ web application, API authentication
Environment Variables:
- MICROSOFT_CLIENT_ID=03d6ee20-cbe3-4d98-867c-084b0419fd96
- NEXT_PUBLIC_MICROSOFT_CLIENT_ID=03d6ee20-cbe3-4d98-867c-084b0419fd96
- OUTLOOK_CLIENT_ID=03d6ee20-cbe3-4d98-867c-084b0419fd96
```

### **Outlook Add-in - "BlocIQ AI Assistant"**
```
App ID: 85e47bf9-847d-4fa6-ab0b-7d73531345db
Usage: Outlook add-in authentication and Microsoft Graph API
Manifest Location: public/outlook-addin/manifest.xml
Application ID URI: api://blociq.co.uk/85e47bf9-847d-4fa6-ab0b-7d73531345db
```

## 🔧 **Azure Configuration Required**

### **For "Bloc IQ LTD" (03d6ee20-cbe3-4d98-867c-084b0419fd96):**
- **Redirect URIs:**
  - https://blociq.co.uk/auth/callback
  - https://www.blociq.co.uk/auth/callback
  - https://blociq.co.uk/outlook/callback
  
- **API Permissions:**
  - Microsoft Graph: Mail.Read, Mail.ReadWrite, Mail.Send, User.Read, Calendars.ReadWrite
  - openid, profile, offline_access

### **For "BlocIQ AI Assistant" (85e47bf9-847d-4fa6-ab0b-7d73531345db):**
- **Redirect URIs:**
  - https://blociq.co.uk/outlook-addin/
  - https://blociq.co.uk/outlook-addin/taskpane.html
  - https://blociq.co.uk/outlook-addin/auth-callback.html
  
- **API Permissions:**
  - Microsoft Graph: Mail.Read, Mail.ReadWrite, Mail.Send, User.Read
  - openid, profile
  
- **Application ID URI:**
  - api://blociq.co.uk/85e47bf9-847d-4fa6-ab0b-7d73531345db
  
- **Expose an API:**
  - Scope: access_as_user

## ✅ **Files Updated**

### **Updated with Main App ID (03d6ee20-cbe3-4d98-867c-084b0419fd96):**
- OUTLOOK_AUTH_FIX_CHECKLIST.md
- scripts/IMMEDIATE_FIXES_SUMMARY.md
- scripts/verify-outlook-config.js
- setup-microsoft-oauth.js

### **Updated with Add-in App ID (85e47bf9-847d-4fa6-ab0b-7d73531345db):**
- public/outlook-addin/manifest.xml

## 🚀 **Next Steps**

1. **Update Environment Variables** in Vercel/Production:
   ```bash
   MICROSOFT_CLIENT_ID=03d6ee20-cbe3-4d98-867c-084b0419fd96
   NEXT_PUBLIC_MICROSOFT_CLIENT_ID=03d6ee20-cbe3-4d98-867c-084b0419fd96
   OUTLOOK_CLIENT_ID=03d6ee20-cbe3-4d98-867c-084b0419fd96
   ```

2. **Configure Azure Apps** as specified above

3. **Grant Admin Consent** for both applications in your tenant

4. **Test Authentication** for both web app and Outlook add-in

## 📝 **Notes**

- **OLD App ID** has been completely removed from the codebase
- **Separation of Concerns**: Main app and add-in now use separate Azure registrations
- **Security**: Each app has only the permissions it needs
