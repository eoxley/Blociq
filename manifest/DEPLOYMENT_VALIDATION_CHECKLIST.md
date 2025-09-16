# Office Add-in Deployment Validation Checklist

## Pre-Deployment Checklist

### ✅ Manifest Files
- [x] **ask-blociq.xml** - Fixed manifest for Ask BlocIQ add-in ✅
- [x] **generate-reply.xml** - Fixed manifest for Generate Reply add-in ✅
- [x] Both manifests use correct GUIDs:
  - Ask BlocIQ: `8b8fe65f-2c9e-4d8a-b8c3-1234567890ab` ✅
  - Generate Reply: `9c9fe65f-3d0f-4e9b-c9d4-2345678901bc` ✅

### ✅ Icon Assets Status
- [x] **icon-16.png** - Available ✅ (16x16)
- [x] **icon-25.png** - Available ✅ (25x25)
- [x] **icon-32.png** - Available ✅ (32x32)
- [x] **icon-48.png** - Available ✅ (48x48)
- [x] **icon-64.png** - Available ✅ (64x64)
- [x] **icon-80.png** - Available ✅ (80x80)

### ✅ Web Endpoints
- [x] **https://www.blociq.co.uk/addin/ask** - Available ✅
- [x] **https://www.blociq.co.uk/addin/reply** - Available ✅
- [x] **https://www.blociq.co.uk/addin/reply/functions.js** - Available ✅
- [x] **https://www.blociq.co.uk/api/addin/generate-reply** - Available ✅

### ✅ Security Headers
- [x] CSP headers present on addin pages ✅
- [x] HTTPS certificates valid ✅
- [x] Frame-ancestors properly configured ✅

## Deployment Steps

### 1. Create Missing Icons
```bash
# Create 25px and 48px versions of existing icons
# Use image editing tool or automated script
cp /public/icons/icon-32.png /public/icons/icon-25.png  # Resize to 25px
cp /public/icons/icon-48.png /public/icons/icon-48.png  # Already exists, verify size
```

### 2. Deploy Function File ✅
```bash
# ✅ COMPLETED: functions.js deployed to public folder
# File is now accessible at: https://www.blociq.co.uk/addin/reply/functions.js
# Status: 200 OK with proper JavaScript content-type and CORS headers
```

### 3. Implement API Endpoint
Create API route at `/api/addin/generate-reply` with:
- POST method support
- JSON request/response handling
- Integration with BlocIQ AI system
- Error handling and validation

### 4. Deploy Fixed Manifests
```bash
# Replace original manifests with fixed versions
cp manifest/ask-blociq-fixed.xml manifest/ask-blociq.xml
cp manifest/generate-reply-fixed.xml manifest/generate-reply.xml
```

## Testing & Validation

### 1. Manifest Validation
- [ ] Run Office Manifest Validator
- [ ] Validate XML schema compliance
- [ ] Check for required fields and proper structure

### 2. URL Accessibility Tests
```bash
# Test all referenced URLs return 200 OK
curl -I https://www.blociq.co.uk/icons/icon-16.png
curl -I https://www.blociq.co.uk/icons/icon-25.png
curl -I https://www.blociq.co.uk/icons/icon-32.png
curl -I https://www.blociq.co.uk/icons/icon-48.png
curl -I https://www.blociq.co.uk/icons/icon-64.png
curl -I https://www.blociq.co.uk/icons/icon-80.png
curl -I https://www.blociq.co.uk/addin/ask
curl -I https://www.blociq.co.uk/addin/reply
curl -I https://www.blociq.co.uk/addin/reply/functions.js
```

### 3. Function File Testing
```javascript
// Test the functions.js file contains:
// - Office.initialize function
// - generateReply function
// - Office.actions.associate call
// - Proper error handling
```

### 4. API Endpoint Testing
```bash
# Test the generate-reply API
curl -X POST https://www.blociq.co.uk/api/addin/generate-reply \
  -H "Content-Type: application/json" \
  -d '{
    "emailBody": "Test email content",
    "sender": {"displayName": "Test User", "emailAddress": "test@example.com"},
    "subject": "Test Subject",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }'
```

## Office Installation Testing

### 1. Sideload Testing
- [ ] Sideload manifest in Outlook Desktop
- [ ] Sideload manifest in Outlook Web
- [ ] Test functionality in both environments

### 2. Production Installation
- [ ] Upload manifests to Office 365 Admin Center
- [ ] Deploy to test users
- [ ] Verify add-ins appear in Outlook ribbon
- [ ] Test all button actions and taskpanes

## Common Issues & Solutions

### Issue: Manifest Installation Fails
**Possible Causes:**
- Invalid XML structure
- Unreachable URLs
- Missing required fields
- Incorrect GUID format

**Solutions:**
- Use XML validator
- Test all URLs manually
- Compare against working manifest examples
- Generate new GUIDs if needed

### Issue: Function Not Executing
**Possible Causes:**
- Functions.js not accessible
- Office.actions.associate not called
- JavaScript errors in function file

**Solutions:**
- Verify functions.js loads without errors
- Check browser console for JavaScript errors
- Test function registration

### Issue: Icons Not Displaying
**Possible Causes:**
- Wrong image format (not PNG)
- Incorrect file sizes
- URLs not accessible

**Solutions:**
- Convert icons to PNG format
- Resize to exact required dimensions
- Test URL accessibility

## Post-Deployment Monitoring

### 1. Performance Metrics
- [ ] Monitor add-in load times
- [ ] Track API response times
- [ ] Monitor error rates

### 2. User Feedback
- [ ] Collect user installation reports
- [ ] Monitor support tickets
- [ ] Track usage analytics

### 3. Security Monitoring
- [ ] Monitor for CSP violations
- [ ] Check SSL certificate status
- [ ] Review access logs

## Emergency Rollback Plan

### If Issues Arise:
1. **Disable add-ins** in Office 365 Admin Center
2. **Restore original manifests** if needed
3. **Investigate and fix issues**
4. **Re-test thoroughly** before re-deployment
5. **Communicate status** to affected users

## Sign-off Checklist

- [ ] All assets deployed and accessible
- [ ] Manifests validated and tested
- [ ] API endpoints functional
- [ ] Security headers configured
- [ ] Sideload testing completed successfully
- [ ] Documentation updated
- [ ] Support team notified of deployment

---

**Deployment Date:** _________________

**Deployed By:** _________________

**Tested By:** _________________

**Approved By:** _________________