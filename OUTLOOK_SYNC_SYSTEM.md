# BlocIQ Outlook Sync + Email Handling Automation

## Overview

The Outlook Sync system provides seamless integration between Microsoft 365 and BlocIQ's inbox management, ensuring real-time email synchronization, automatic handling status tracking, and folder management.

## Features

### 🔄 Real-Time Email Sync
- **Automatic Sync**: Every 5 minutes via Vercel Cron
- **Manual Sync**: On-demand sync from inbox interface
- **Incremental Updates**: Only syncs new emails since last sync
- **Rate Limiting**: Conservative limits to prevent API throttling

### 📧 Email Handling Automation
- **Mark as Handled**: Move emails to "BlocIQ/Handled" folder in Outlook
- **Status Tracking**: Track handled/unhandled status in database
- **Folder Management**: Create and manage custom folders
- **Audit Trail**: Log all handling actions with timestamps

### 🏢 Building Integration
- **Automatic Matching**: Match leaseholder emails to units/buildings
- **Subject Parsing**: Fallback matching using "Flat X" patterns
- **Context Awareness**: Associate emails with specific properties

## Database Schema

### Enhanced `incoming_emails` Table
```sql
-- Core email fields
id UUID PRIMARY KEY,
message_id TEXT UNIQUE NOT NULL,
outlook_message_id TEXT,  -- For Graph API operations
thread_id TEXT,
subject TEXT,
from_email TEXT,
from_name TEXT,
to_email TEXT[],
cc_email TEXT[],
body TEXT,
body_preview TEXT,
received_at TIMESTAMP WITH TIME ZONE,

-- Status and handling fields
is_read BOOLEAN DEFAULT FALSE,
is_handled BOOLEAN DEFAULT FALSE,
handled_at TIMESTAMP WITH TIME ZONE,
handled_by UUID REFERENCES auth.users(id),
folder TEXT DEFAULT 'inbox',
sync_status TEXT DEFAULT 'synced',
last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

-- Building association
building_id UUID REFERENCES buildings(id),
unit TEXT,

-- Metadata
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### `email_sync_state` Table
```sql
id UUID PRIMARY KEY,
last_sync_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
sync_status TEXT DEFAULT 'idle',
error_message TEXT,
emails_processed INTEGER DEFAULT 0,
emails_new INTEGER DEFAULT 0,
emails_updated INTEGER DEFAULT 0,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### `outlook_folders` Table
```sql
id UUID PRIMARY KEY,
folder_id TEXT UNIQUE NOT NULL,
display_name TEXT NOT NULL,
folder_type TEXT NOT NULL, -- 'inbox', 'sent', 'handled', 'custom'
is_default BOOLEAN DEFAULT FALSE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

## API Endpoints

### `/api/sync-inbox`
Manual email synchronization endpoint.

**Request:**
```typescript
{
  forceSync?: boolean,
  previewOnly?: boolean
}
```

**Response:**
```typescript
{
  success: boolean,
  previewOnly: boolean,
  summary: {
    processed: number,
    new: number,
    updated: number,
    errors: number
  },
  results: Array<{
    email: EmailData,
    status: string,
    error?: any
  }>
}
```

### `/api/mark-handled`
Mark email as handled and move to Outlook folder.

**Request:**
```typescript
{
  messageId: string,
  userId?: string,
  moveToFolder?: "handled" | "processed" | "custom",
  customFolderName?: string
}
```

**Response:**
```typescript
{
  success: boolean,
  messageId: string,
  folder: string,
  handledAt: string
}
```

### `/api/cron/sync-inbox`
Automated cron job endpoint (called every 5 minutes).

**Headers:**
```
Authorization: Bearer {CRON_SECRET}
```

**Response:**
```typescript
{
  success: boolean,
  summary: {
    processed: number,
    new: number,
    updated: number
  },
  timestamp: string
}
```

## Cron Job Configuration

### Vercel Configuration (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-inbox",
      "schedule": "*/5 * * * *"
    }
  ],
  "functions": {
    "app/api/cron/sync-inbox/route.ts": {
      "maxDuration": 60
    }
  }
}
```

### Environment Variables
```bash
# Microsoft Graph API
OUTLOOK_CLIENT_ID=your_client_id
OUTLOOK_CLIENT_SECRET=your_client_secret
OUTLOOK_TENANT_ID=your_tenant_id

# Cron Security
CRON_SECRET=your_cron_secret_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Microsoft Graph API Integration

### Required Permissions
- `Mail.Read` - Read emails from mailbox
- `Mail.ReadWrite` - Move emails between folders
- `Mail.ReadWrite.Shared` - Access shared mailboxes

### Authentication Flow
1. **Client Credentials**: Uses app-only authentication
2. **Token Management**: Automatic token refresh via MSAL
3. **Error Handling**: Exponential backoff for rate limits

### Folder Operations
```typescript
// Create folder
POST /users/{user-id}/mailFolders
{
  "displayName": "BlocIQ/Handled",
  "parentFolderId": "inbox"
}

// Move email
POST /users/{user-id}/messages/{message-id}/move
{
  "destinationId": "{folder-id}"
}
```

## User Interface Features

### Inbox List (`/dashboard/inbox`)
- **Filter Options**: All, Unread, Unhandled, Handled, Inbox Only
- **Status Badges**: New, Handled, Folder indicators
- **Sync Status**: Real-time sync status with manual trigger
- **Email Counts**: Total, unhandled, and handled counts

### Email Detail (`/dashboard/inbox/[id]`)
- **Complete Email View**: Full message with metadata
- **Reply Integration**: AI-powered reply functionality
- **Handling Actions**: Mark as handled with folder selection
- **Building Context**: Associated property information

### Visual Indicators
- **Unread Emails**: Blue left border and background
- **Handled Emails**: Green left border and background
- **Status Badges**: Color-coded status indicators
- **Folder Badges**: Show current folder location

## Email Matching Logic

### Primary Matching (Leaseholder Email)
```typescript
// Match by leaseholder email address
const { data: unitMatch } = await supabase
  .from("units")
  .select("unit_number, building_id, buildings(name)")
  .eq("leaseholder_email", email.from_email)
  .single();
```

### Fallback Matching (Subject Parsing)
```typescript
// Match "Flat 7" or "Flat 7A" in subject
const match = email.subject?.match(/flat\s?(\d+[A-Za-z]?)/i);
if (match) {
  const flat = `Flat ${match[1]}`;
  const { data: fallbackUnit } = await supabase
    .from("units")
    .select("unit_number, building_id, buildings(name)")
    .eq("unit_number", flat)
    .single();
}
```

## Error Handling & Monitoring

### Sync Error Handling
- **Rate Limiting**: Exponential backoff for API limits
- **Network Errors**: Retry logic with error logging
- **Database Errors**: Transaction rollback and error reporting
- **Partial Failures**: Continue processing other emails

### Monitoring & Logging
- **Sync State Tracking**: Database logging of all sync operations
- **Error Logging**: Detailed error messages with context
- **Performance Metrics**: Processing time and email counts
- **Health Checks**: Sync status monitoring

### Recovery Mechanisms
- **Incremental Sync**: Resume from last successful sync
- **Duplicate Prevention**: Message ID deduplication
- **Status Recovery**: Re-sync failed operations
- **Manual Override**: Force sync when needed

## Security & Permissions

### Row Level Security (RLS)
```sql
-- Users can only view emails for buildings they have access to
CREATE POLICY "Users can view emails for accessible buildings" ON incoming_emails
    FOR SELECT USING (
        building_id IN (
            SELECT building_id FROM user_buildings WHERE user_id = auth.uid()
        )
    );

-- Users can update emails they have permission for
CREATE POLICY "Users can update accessible emails" ON incoming_emails
    FOR UPDATE USING (
        building_id IN (
            SELECT building_id FROM user_buildings WHERE user_id = auth.uid()
        )
    );
```

### API Security
- **Cron Authentication**: Secret-based cron job protection
- **Rate Limiting**: Prevent abuse of sync endpoints
- **Input Validation**: Sanitize all user inputs
- **Error Sanitization**: Don't expose sensitive data in errors

## Performance Optimization

### Database Optimization
- **Indexes**: Optimized queries for common filters
- **Pagination**: Limit results to prevent memory issues
- **Batch Operations**: Efficient bulk insert/update operations
- **Connection Pooling**: Reuse database connections

### API Optimization
- **Caching**: Cache folder IDs and building data
- **Parallel Processing**: Process multiple emails concurrently
- **Selective Sync**: Only sync necessary email fields
- **Compression**: Reduce payload sizes

## Future Enhancements

### Planned Features
- **Smart Filtering**: AI-powered email categorization
- **Auto-Reply Rules**: Automatic response based on patterns
- **Bulk Operations**: Handle multiple emails at once
- **Advanced Search**: Full-text search across emails
- **Email Templates**: Pre-built response templates

### Advanced Integration
- **Calendar Integration**: Link emails to calendar events
- **Task Creation**: Convert emails to actionable tasks
- **Document Linking**: Associate emails with documents
- **Workflow Automation**: Trigger actions based on email content

## Troubleshooting

### Common Issues
1. **Sync Not Working**: Check Microsoft Graph permissions
2. **Rate Limiting**: Reduce sync frequency or increase limits
3. **Authentication Errors**: Verify client credentials
4. **Database Errors**: Check RLS policies and permissions

### Debug Commands
```bash
# Test sync manually
curl -X POST /api/sync-inbox -H "Content-Type: application/json" -d '{"previewOnly": true}'

# Check sync state
SELECT * FROM email_sync_state ORDER BY created_at DESC LIMIT 5;

# View recent emails
SELECT * FROM incoming_emails ORDER BY received_at DESC LIMIT 10;
```

This system provides a complete, production-ready email management solution that seamlessly integrates Microsoft 365 with BlocIQ's property management workflow. 