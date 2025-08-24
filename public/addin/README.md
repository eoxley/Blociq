# BlocIQ Assistant Outlook Add-in

A Microsoft 365 Outlook add-in that provides AI-powered email assistance for the BlocIQ platform.

## Features

- **Email Analysis**: AI-powered analysis of email content and context
- **Reply Drafting**: Intelligent reply suggestions and drafting
- **Email Summarization**: Quick summaries of email content
- **Email Triage**: Priority classification and action recommendations
- **Modern UI**: Clean, responsive interface that works on desktop and web

## Files Structure

```
public/addin/
├── manifest.xml          # Office Add-in manifest file
├── taskpane.html        # Main taskpane interface
├── taskpane.js          # Taskpane functionality and Office.js integration
├── function.js          # Function commands for ribbon integration
└── README.md            # This file
```

## Setup Instructions

### 1. Deploy Files

Ensure all files are deployed to your Vercel project and accessible at:
- `https://blociq.co.uk/addin/manifest.xml`
- `https://blociq.co.uk/addin/taskpane.html`
- `https://blociq.co.uk/addin/taskpane.js`
- `https://blociq.co.uk/addin/function.js`

### 2. Sideload in Outlook Desktop

1. **Download the manifest**:
   - Visit `https://blociq.co.uk/addin/manifest.xml`
   - Save the file locally

2. **Sideload in Outlook**:
   - Open Outlook Desktop
   - Go to **Get Add-ins** → **My Add-ins**
   - Click **Add Custom Add-in** → **Add from File**
   - Select the downloaded `manifest.xml`
   - Click **Install**

### 3. Test the Add-in

1. Open any email in Outlook
2. Look for the **BlocIQ Assistant** button in the ribbon
3. Click to open the taskpane
4. Test the various functions:
   - Analyze Email
   - Draft Reply
   - Summarize
   - Triage Email

## Configuration

### Icons

The add-in expects the following icon files at:
- `https://blociq.co.uk/assets/icon-16.png` (16x16)
- `https://blociq.co.uk/assets/icon-25.png` (25x25)
- `https://blociq.co.uk/assets/icon-32.png` (32x32)
- `https://blociq.co.uk/assets/icon-80.png` (80x80)

### API Integration

The add-in is configured to make API calls to:
- `https://blociq.co.uk/api/ai/{endpoint}`

You'll need to implement these endpoints and update the authentication in `taskpane.js`.

## Manifest Details

- **Add-in ID**: `blocIQ-assistant`
- **Version**: `1.0.0.0`
- **Permissions**: `ReadWriteMailbox`
- **Supported Hosts**: Outlook (Desktop & Web)
- **Form Types**: Message Read, Message Compose, Appointment Read, Appointment Edit

## Development

### Local Testing

1. Use a local web server (e.g., `python -m http.server 8000`)
2. Update manifest URLs to point to localhost
3. Sideload the local manifest

### Office.js API

The add-in uses the Office.js API for:
- Reading email properties
- Composing replies
- Setting email importance
- Displaying taskpanes

### Customization

- Update the UI in `taskpane.html`
- Modify functionality in `taskpane.js`
- Add new ribbon commands in `manifest.xml`
- Implement actual AI API calls

## Troubleshooting

### Common Issues

1. **Add-in not appearing**: Check manifest syntax and ensure all URLs are accessible
2. **Office.js errors**: Verify Office.js is loaded before calling Office APIs
3. **CORS issues**: Ensure your domain allows cross-origin requests from Office

### Debug Mode

Enable debug mode in Outlook:
1. Go to **File** → **Options** → **Advanced**
2. Check **Enable debugging tools for add-ins**

## Support

For issues or questions:
- Check the browser console for JavaScript errors
- Verify all files are accessible at the expected URLs
- Test with a simple manifest first

## Security Notes

- The add-in requests `ReadWriteMailbox` permissions
- Ensure your API endpoints are properly secured
- Implement proper authentication for AI service calls
- Validate all user inputs and API responses

## Future Enhancements

- Calendar integration
- Contact management
- Advanced AI features
- Custom ribbon commands
- Mobile optimization
- Offline support
