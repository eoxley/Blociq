# BlocIQ Combined Outlook Add-in

## Overview

The BlocIQ Combined Outlook Add-in consolidates all three BlocIQ features into a single installation, providing a streamlined user experience for property management professionals.

## Features

### 🔧 Single Installation
- **One add-in** replaces three separate installations
- **Unified interface** in Outlook ribbon
- **Consistent branding** across all features

### 📝 Generate Reply
- AI-powered contextual email responses
- Building and unit reference detection
- Professional property management tone
- Anti-hallucination with real data integration

### 📋 Triage Inbox
- Bulk email processing and categorization
- Automatic action item creation
- Progress tracking and batch processing
- Integration with building management system

### 💬 Ask BlocIQ
- Chat interface for property management questions
- Access to building database and industry knowledge
- Contextual responses based on email content
- AGM, inspection, and maintenance query handling

## Installation

### 1. Download Manifest
Save the combined manifest file: `manifest-combined.xml`

### 2. Install in Outlook
- **Outlook Desktop**: File → Get Add-ins → My add-ins → Custom add-ins → Add from file
- **Outlook Web**: Settings → Mail → General → Manage add-ins → My add-ins → Add from file
- **Admin Deployment**: Use Microsoft 365 admin center for organization-wide deployment

### 3. Verify Installation
- Open Outlook and compose/reply to an email
- Look for "BlocIQ" group in the ribbon with three buttons:
  - **Generate Reply**
  - **Triage Inbox**
  - **Ask BlocIQ**

## Usage

### Generate Reply
1. Open an email to reply to
2. Click **Generate Reply** button
3. AI analyzes email content and building references
4. Professional response is inserted into email body
5. Review and send as normal

### Triage Inbox
1. Click **Triage Inbox** button from any email
2. Add-in scans unread messages in inbox
3. Creates action items in BlocIQ system
4. Progress notifications show batch processing status
5. Summary report shows successful categorizations

### Ask BlocIQ
1. Click **Ask BlocIQ** button
2. Opens chat interface (when fully implemented)
3. Ask property management questions
4. Get contextual responses with building data
5. Access AGM schedules, inspection dates, etc.

## Technical Details

### Files Structure
```
/public/outlook-addin/
├── manifest-combined.xml     # Combined manifest file
├── functions.html           # Unified function implementations
├── home.html               # Welcome/info page
├── README-COMBINED.md      # This documentation
└── icons/                  # Add-in icons (16px, 32px, 80px)
```

### API Endpoints
- **Reply Generation**: `/api/ask-ai-outlook`
- **Inbox Triage**: `/api/inbox-triage`
- **Chat Interface**: `/api/addin/chat`

### Permissions Required
- `ReadWriteMailbox` - Full access to read/write email content
- Microsoft Graph API access for inbox triage functionality

## Migration from Separate Add-ins

### For Users Currently Using Multiple Add-ins:
1. **Remove existing add-ins** (Generate Reply, Triage, Ask BlocIQ)
2. **Install combined add-in** using new manifest
3. **Same functionality** - no workflow changes needed
4. **Single ribbon group** replaces multiple groups

### Benefits of Migration:
- ✅ Simplified installation process
- ✅ Reduced Outlook ribbon clutter
- ✅ Consistent user experience
- ✅ Easier maintenance and updates
- ✅ Better performance with shared resources

## Development Notes

### Function Mapping
- `generateBlocIQReply()` - Handles Generate Reply button
- `triageInbox()` - Handles Triage Inbox button
- `askBlocIQ()` - Handles Ask BlocIQ button

### Shared Utilities
- `showToastNotification()` - User feedback
- `showProgressNotification()` - Progress updates
- Building/unit reference extraction
- Email context parsing

### Error Handling
- Graceful fallbacks for API failures
- User-friendly error messages
- Detailed console logging for debugging
- Network connectivity awareness

## Deployment

### Production URLs
All references point to production endpoints:
- `https://www.blociq.co.uk/outlook-addin/`
- `https://www.blociq.co.uk/api/`

### Testing
For development/testing, update URLs in manifest:
- Change `blociq.co.uk` to `localhost:3001`
- Update API endpoints for local testing
- Use development icons and resources

## Support

### Installation Issues
- Verify Outlook version compatibility (requires Mailbox 1.3+)
- Check network connectivity to BlocIQ servers
- Ensure proper permissions in organization policy

### Functionality Issues
- Check browser console for error messages
- Verify user email authentication with BlocIQ
- Test individual functions to isolate issues

### Contact
- **Support**: support@blociq.co.uk
- **Documentation**: https://www.blociq.co.uk/docs
- **Updates**: Automatic through Outlook add-in store

## Version History

### v1.0.0 - Combined Release
- Initial combined add-in release
- Consolidates Generate Reply, Triage, and Ask BlocIQ
- Unified ribbon interface
- Shared function library
- Enhanced error handling

---

**Note**: This combined add-in replaces the need for three separate installations while maintaining all existing functionality and improving the overall user experience.