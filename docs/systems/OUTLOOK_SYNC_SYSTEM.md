# Outlook Sync System

## Overview

The Outlook Sync System allows BlocIQ to automatically sync emails from users' Outlook inboxes into the Supabase database. This enables AI analysis, task creation, and centralized email management.

## Features

- ✅ **OAuth 2.0 Authentication**: Secure connection to Microsoft Graph API
- 📧 **Email Sync**: Import up to 20 recent emails from Outlook inbox
- 🔄 **Duplicate Prevention**: Uses `internetMessageId` to prevent duplicate imports
- 👤 **User Association**: Emails are associated with the connected user
- 🤖 **AI Ready**: Synced emails can be analyzed by the AI assistant
- ⏰ **Automatic Sync**: Cron job support for regular syncing
- 🛡️ **Security**: Row Level Security (RLS) ensures users only see their own emails

## API Endpoints

### 1. Manual Sync
**POST** `/api/sync-outlook-inbox`

Syncs the current user's Outlook inbox.

**Response:**
```json
{
  "success": true,
  "synced": 5,
  "message": "Successfully synced 5 new emails from Outlook"
}
```

### 2. Cron Job Sync
**POST** `/api/cron/sync-outlook`

Automated sync for all connected users (requires `CRON_SECRET_TOKEN`).

**Headers:**
```
Authorization: Bearer <CRON_SECRET_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "totalSynced": 15,
  "results": [
    {
      "userId": "uuid",
      "email": "user@example.com",
      "synced": 3,
      "success": true
    }
  ],
  "message": "Cron job completed. Synced 15 emails across 3 users."
}
```

## Database Schema

### incoming_emails Table Updates

```sql
-- New fields for Outlook integration
ALTER TABLE incoming_emails ADD COLUMN outlook_id TEXT;
ALTER TABLE incoming_emails ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Indexes for performance
CREATE INDEX idx_incoming_emails_outlook_id ON incoming_emails(outlook_id);
CREATE INDEX idx_incoming_emails_user_id ON incoming_emails(user_id);

-- Unique constraint to prevent duplicates
ALTER TABLE incoming_emails ADD CONSTRAINT unique_outlook_id UNIQUE (outlook_id);
```

### Field Descriptions

- `outlook_id`: Unique identifier from Outlook (`internetMessageId`)
- `user_id`: User who owns this email (for RLS)
- `subject`: Email subject line
- `from_name`: Sender's display name
- `from_email`: Sender's email address
- `received_at`: When the email was received
- `preview`: Email body preview
- `building_id`: Associated building (determined by AI analysis)
- `isUnread`: Whether the email is unread
- `is_handled`: Whether the email has been handled

## Setup Instructions

### 1. Database Setup

Run the SQL script to update the database schema:

```bash
# Execute in Supabase SQL editor
\i scripts/updateIncomingEmailsTable.sql
```

### 2. Environment Variables

Add these to your `.env.local`:

```bash
# Microsoft Graph API
OUTLOOK_CLIENT_ID=your_microsoft_app_client_id
OUTLOOK_CLIENT_SECRET=your_microsoft_app_client_secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Cron job security
CRON_SECRET_TOKEN=your_secure_cron_token
```

### 3. Microsoft App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Register a new application
3. Add redirect URI: `http://localhost:3000/api/auth/outlook/callback`
4. Grant permissions: `Calendars.ReadWrite`, `Mail.Read`
5. Copy Client ID and Client Secret to environment variables

## Usage Flow

### 1. User Connection

1. User clicks "Connect Outlook" in the inbox
2. Redirected to Microsoft OAuth consent screen
3. User authorizes BlocIQ access
4. Tokens stored securely in HTTP-only cookies
5. Connection status updated to "Connected"

### 2. Manual Sync

1. User clicks "Sync Inbox" button
2. System fetches 20 most recent emails from Outlook
3. New emails are inserted into `incoming_emails` table
4. Duplicate emails are automatically skipped
5. Inbox refreshes to show new emails

### 3. AI Integration

1. Synced emails appear in the inbox
2. AI can analyze emails and suggest actions
3. Users can create tasks from email content
4. Calendar events can be added from AI suggestions

## Security Features

### Row Level Security (RLS)

```sql
-- Users can only see their own emails
CREATE POLICY "Users can view own emails" ON incoming_emails
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emails" ON incoming_emails
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Token Security

- Access tokens stored in HTTP-only cookies
- Automatic token refresh when expired
- Secure cookie settings in production
- No token exposure to client-side JavaScript

### Cron Job Security

- Requires `CRON_SECRET_TOKEN` for authentication
- Rate limiting to prevent abuse
- Error handling and logging

## Error Handling

### Common Errors

1. **Token Expired**: Automatic refresh attempted
2. **Outlook Not Connected**: User prompted to connect
3. **Duplicate Emails**: Automatically skipped
4. **API Rate Limits**: Implemented retry logic
5. **Network Errors**: Graceful degradation

### Logging

All sync operations are logged with:
- User ID
- Number of emails synced
- Success/failure status
- Error details (if applicable)

## Future Enhancements

### Planned Features

- 📅 **Scheduled Sync**: Configurable sync intervals
- 🏗️ **Building Detection**: AI-powered building association
- 📊 **Sync Analytics**: Dashboard showing sync statistics
- 🔔 **Notifications**: Email alerts for new messages
- 📱 **Mobile Support**: Push notifications for new emails

### Technical Improvements

- 🗄️ **Database Tokens**: Move from cookies to database storage
- 🔄 **Incremental Sync**: Only sync new emails since last sync
- 📈 **Performance**: Batch processing for large email volumes
- 🛡️ **Encryption**: Encrypt sensitive email data at rest

## Troubleshooting

### Connection Issues

1. Check environment variables are set correctly
2. Verify Microsoft app registration is complete
3. Ensure redirect URI matches exactly
4. Check browser console for OAuth errors

### Sync Issues

1. Verify Outlook connection status
2. Check network connectivity to Microsoft Graph API
3. Review server logs for detailed error messages
4. Ensure database schema is up to date

### Performance Issues

1. Monitor sync frequency and volume
2. Check database indexes are created
3. Review RLS policies for efficiency
4. Consider implementing rate limiting

## Support

For issues with the Outlook sync system:

1. Check the server logs for error details
2. Verify all environment variables are set
3. Test the OAuth flow manually
4. Review the Microsoft Graph API documentation
5. Contact the development team with specific error messages 