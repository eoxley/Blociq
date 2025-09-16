# Required Office Add-in Endpoints

## Overview
This document lists all the required endpoints that need to be implemented for the BlocIQ Office add-ins to function properly.

## 1. Ask BlocIQ Add-in Endpoints

### Primary Taskpane URL
- **URL**: `https://www.blociq.co.uk/addin/ask`
- **Purpose**: Main HTML page for the ask add-in taskpane
- **Requirements**:
  - Must load Office.js library
  - Must implement proper HTTPS and CSP headers
  - Should handle Office authentication context
  - Must work within Office iframe constraints

### Icon Assets
- **16px Icon**: `https://www.blociq.co.uk/icons/icon-16.png` ✅ (Already accessible)
- **25px Icon**: `https://www.blociq.co.uk/icons/icon-25.png` ⚠️ (Needs to be created)
- **32px Icon**: `https://www.blociq.co.uk/icons/icon-32.png` ✅ (Already accessible)
- **48px Icon**: `https://www.blociq.co.uk/icons/icon-48.png` ⚠️ (Needs to be created)
- **64px Icon**: `https://www.blociq.co.uk/icons/icon-64.png` ✅ (Already accessible)
- **80px Icon**: `https://www.blociq.co.uk/icons/icon-80.png` ✅ (Already accessible)

## 2. Generate Reply Add-in Endpoints

### Primary HTML Page
- **URL**: `https://www.blociq.co.uk/addin/reply`
- **Purpose**: Main HTML page for the generate reply add-in
- **Requirements**: Same as Ask BlocIQ add-in

### Function File
- **URL**: `https://www.blociq.co.uk/addin/reply/functions.js`
- **Purpose**: JavaScript file containing Office.js function implementations
- **Requirements**:
  - Must implement `generateReply()` function
  - Must call `Office.actions.associate()` to register functions
  - Must handle Office.js event completion properly
- **Status**: ✅ Created (needs deployment to public folder)

### API Endpoint for Reply Generation
- **URL**: `https://www.blociq.co.uk/api/addin/generate-reply`
- **Method**: POST
- **Purpose**: Backend API to generate AI-powered email replies
- **Requirements**:
  - Accept JSON payload with email content, sender, subject
  - Return structured JSON response with generated reply
  - Handle authentication and rate limiting
  - Integrate with BlocIQ AI system
- **Status**: ❌ Needs implementation

### Icon Assets
Same as Ask BlocIQ add-in (can share the same icons)

## 3. Backend API Endpoints to Implement

### `/api/addin/generate-reply`
```javascript
// Expected request body:
{
  "emailBody": "string - original email content",
  "sender": {
    "displayName": "string",
    "emailAddress": "string"
  },
  "subject": "string - email subject",
  "timestamp": "ISO string"
}

// Expected response:
{
  "success": boolean,
  "reply": "string - generated HTML reply content",
  "error": "string - error message if failed"
}
```

### `/api/addin/auth` (Optional)
- Purpose: Handle Office add-in authentication
- Method: GET/POST
- Returns user token or auth status

### `/api/addin/user-context` (Optional)
- Purpose: Get user's property management context
- Method: GET
- Returns user buildings, preferences, etc.

## 4. Static Assets Requirements

### Content Security Policy Headers
All add-in pages must include proper CSP headers:
```
Content-Security-Policy:
  frame-ancestors 'self' https://outlook.office.com https://outlook.office365.com https://*.office.com https://*.office365.com;
  script-src 'self' 'unsafe-inline' https://appsforoffice.microsoft.com;
  connect-src 'self' https://www.blociq.co.uk;
```

### Required JavaScript Libraries
- Office.js: Must be loaded from Microsoft CDN
- BlocIQ client-side libraries for API communication

### HTTPS Requirements
- All URLs must use HTTPS
- Valid SSL certificate required
- No mixed content warnings

## 5. Mobile Support Requirements

### Additional Icon Sizes
- 25px icon (for mobile)
- 48px icon (for mobile)

### Mobile-Responsive Design
- Add-in pages must work on mobile Outlook clients
- Touch-friendly interface elements
- Responsive CSS media queries

## 6. Testing Endpoints

### Manifest Validation
Test manifests using Office Dev Tools:
- Use Office Manifest Validator
- Test sideloading in Outlook desktop/web
- Verify in Office 365 admin center

### Function Testing
- Test `generateReply()` function execution
- Verify Office.js API calls
- Test error handling and user notifications

## Implementation Priority

### High Priority ❗
1. Create missing icon files (25px, 48px)
2. Implement `/api/addin/generate-reply` endpoint
3. Deploy `functions.js` to public folder
4. Add proper CSP headers to existing addin pages

### Medium Priority
1. Implement optional auth endpoints
2. Add mobile-specific optimizations
3. Enhanced error handling

### Low Priority
1. Performance optimizations
2. Additional API endpoints
3. Advanced features

## Deployment Notes

- Deploy fixed manifest files to production
- Ensure all static assets are available
- Test manifest installation in Office environment
- Monitor endpoint availability and performance