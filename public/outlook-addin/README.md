# BlocIQ Outlook Add-in

## Deployment Instructions

### 1. Sideloading the Add-in

The unified manifest is available at: `https://www.blociq.co.uk/outlook-addin/manifest.xml`

#### For Outlook Web:
1. Go to Outlook Web (outlook.office.com)
2. Click the gear icon (Settings) → View all Outlook settings
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

### 2. Features

- **Ask BlocIQ**: AI-powered property management assistant
- **Generate Reply**: Intelligent email reply generation
- **Email Analysis**: Context-aware email insights
- **Property Management**: Specialized guidance for property managers

### 3. URLs Referenced

- **Manifest**: `https://www.blociq.co.uk/outlook-addin/manifest.xml`
- **Task Pane**: `https://www.blociq.co.uk/addin/ask`
- **Reply Generation**: `https://www.blociq.co.uk/addin/reply`
- **Function File**: `https://www.blociq.co.uk/addin/reply/functions.js`
- **API Endpoints**: `https://www.blociq.co.uk/api/addin/*`

### 4. Troubleshooting

If sideloading fails:
1. Ensure all URLs are accessible via HTTPS
2. Check that CORS headers are properly configured
3. Verify the manifest XML is valid
4. Test in different Outlook environments (Web, Desktop, Mobile)

### 5. Development

To test locally:
1. Update manifest URLs to point to your local development server
2. Ensure CORS headers allow your local domain
3. Use the validation script: `node scripts/validate-addin.js`
