# BlocIQ Outlook Add-in Deployment Guide

## ✅ Issues Fixed

### 1. **Unified Manifest** 
- ✅ Created single unified manifest at `public/outlook-addin/manifest.xml`
- ✅ Combined task pane and command functionality in one add-in
- ✅ Single add-in ID: `8b8fe65f-2c9e-4d8a-b8c3-1234567890ab`

### 2. **Fixed CORS Headers**
- ✅ Updated `next.config.ts` to support all Outlook domains
- ✅ Added support for `outlook.office.com`, `outlook.office365.com`, `outlook.live.com`
- ✅ Set `Access-Control-Allow-Origin: *` for broader compatibility

### 3. **Fixed Validation Script**
- ✅ Updated `scripts/validate-addin.js` to work with current file structure
- ✅ Added fallback to individual manifests if unified manifest not found
- ✅ Made script more robust with error handling

### 4. **Created Missing Directory Structure**
- ✅ Created `public/outlook-addin/` directory
- ✅ Added unified manifest at `public/outlook-addin/manifest.xml`
- ✅ Added deployment documentation

### 5. **Added Deployment Tools**
- ✅ Created `scripts/update-addin-urls.js` for environment-specific URL updates
- ✅ Created `scripts/test-addin-urls.js` for URL accessibility testing
- ✅ Added npm scripts for easy deployment management

## 🚀 Deployment Instructions

### Step 1: Deploy to Production
```bash
# Deploy your Next.js app to production
npm run build
npm run start
# or deploy to Vercel/your hosting platform
```

### Step 2: Verify URLs
```bash
# Test all add-in URLs
npm run addin:urls:test
```

### Step 3: Sideload in Outlook

#### For Outlook Web:
1. Go to [Outlook Web](https://outlook.office.com)
2. Click Settings (gear icon) → View all Outlook settings
3. Go to Mail → Customize actions → Add-ins
4. Click "Add a custom add-in" → "Add from URL"
5. Enter: `https://www.blociq.co.uk/outlook-addin/manifest.xml`
6. Click "Install"

#### For Outlook Desktop:
1. Open Outlook Desktop
2. Go to File → Manage Add-ins
3. Click "Add a custom add-in" → "Add from URL"
4. Enter: `https://www.blociq.co.uk/outlook-addin/manifest.xml`
5. Click "Install"

## 📋 Available NPM Scripts

```bash
# Validate manifest
npm run addin:manifest:validate

# Test all URLs
npm run addin:urls:test

# Update URLs for different environments
npm run addin:urls:update:prod    # Production
npm run addin:urls:update:dev     # Development
npm run addin:urls:update:local   # Local development
```

## 🔧 Environment Configuration

### Production URLs
- **Manifest**: `https://www.blociq.co.uk/outlook-addin/manifest.xml`
- **Task Pane**: `https://www.blociq.co.uk/addin/ask`
- **Reply Generation**: `https://www.blociq.co.uk/addin/reply`
- **Function File**: `https://www.blociq.co.uk/addin/reply/functions.js`

### Development URLs
- **Manifest**: `https://blociq-frontend.vercel.app/outlook-addin/manifest.xml`
- **Task Pane**: `https://blociq-frontend.vercel.app/addin/ask`
- **Reply Generation**: `https://blociq-frontend.vercel.app/addin/reply`
- **Function File**: `https://blociq-frontend.vercel.app/addin/reply/functions.js`

## 🎯 Add-in Features

### Unified Interface
- **Single Installation**: One add-in provides both features
- **Ribbon Integration**: Both buttons appear in Outlook ribbon
- **Context Aware**: Automatically detects email context

### Ask BlocIQ (Task Pane)
- AI-powered property management assistant
- Email analysis and insights
- Quick action buttons for common tasks
- Context-aware responses based on current email

### Generate Reply (Command)
- Intelligent email reply generation
- One-click reply creation
- Professional templates
- Property management focused responses

## 🛠️ Troubleshooting

### Sideload Fails
1. **Check URL Accessibility**: Run `npm run addin:urls:test`
2. **Verify CORS Headers**: Ensure headers allow your Outlook domain
3. **Check Manifest Validity**: Run `npm run addin:manifest:validate`
4. **Test in Different Outlook Environments**: Web vs Desktop vs Mobile

### Common Issues
- **404 on Manifest**: Ensure `public/outlook-addin/manifest.xml` is deployed
- **CORS Errors**: Check `next.config.ts` headers configuration
- **Function File Errors**: Verify `public/addin/reply/functions.js` is accessible
- **API Errors**: Check that API endpoints return proper CORS headers

### Debug Steps
1. Test manifest URL directly in browser
2. Check browser developer tools for CORS errors
3. Verify all referenced URLs are accessible
4. Test with different Outlook accounts/tenants

## 📊 Current Status

### ✅ Working
- Manifest structure and validation
- CORS headers configuration
- Task pane and command button definitions
- Function file integration
- API endpoint structure

### ⚠️ Needs Deployment
- Manifest file needs to be deployed to production
- API endpoints need to be tested with actual requests
- Icons and assets need to be verified

### 🔄 Next Steps
1. Deploy the updated code to production
2. Test sideloading in Outlook
3. Verify all functionality works end-to-end
4. Submit to Microsoft Partner Center for approval (optional)

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Run the validation and testing scripts
3. Review browser developer tools for errors
4. Test with different Outlook environments

The add-in is now properly configured for deployment and should sideload successfully in Outlook!
