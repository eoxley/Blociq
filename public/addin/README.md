# BlocIQ Outlook Add-in

## Overview
This Outlook add-in provides AI-powered assistance for email triage and management directly within Outlook.

## Files
- `manifest.xml` - Add-in configuration and metadata
- `function.js` - Function commands for the Office add-in
- `taskpane.html` - Main add-in interface
- `icon-32.png` - Add-in icon for the Outlook ribbon
- `taskpane.js` - Additional JavaScript functionality (legacy)

## Installation

### For Development/Testing:
1. **Sideload the add-in:**
   - Open Outlook (desktop or web)
   - Go to Get Add-ins → My Add-ins → Add Custom Add-in → Add from File
   - Select the `manifest.xml` file from this folder

2. **The add-in will appear in the Outlook ribbon** with a "BlocIQ Assistant" button

### For Production:
1. **Deploy files to your web server** (e.g., `https://www.blociq.co.uk/addin/`)
2. **Update manifest.xml** to use production URLs
3. **Submit to Microsoft AppSource** for distribution

## Usage
1. **Open an email** in Outlook
2. **Click the "BlocIQ Assistant" button** in the ribbon
3. **The add-in will open** in a dialog window
4. **Use the AI assistant** to triage, summarize, or draft replies

## Features
- ✅ **Email Analysis** - AI-powered email triage
- ✅ **Smart Summaries** - Automatic email summarization  
- ✅ **Reply Drafting** - AI-generated response suggestions
- ✅ **Compliance Checking** - Built-in compliance monitoring

## Development Notes
- Uses Office.js API for Outlook integration
- Supports both read and compose modes
- Requires `ReadWriteMailbox` permissions
- Compatible with Outlook 2016+ and Outlook Web

## Troubleshooting
- **Add-in not appearing:** Check manifest.xml syntax and reload
- **Function errors:** Verify Office.js is loaded correctly
- **Icon issues:** Ensure icon-32.png exists and is valid PNG format
- **Permission errors:** Check mailbox permissions in manifest.xml
