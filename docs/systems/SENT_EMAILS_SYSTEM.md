# Sent Emails Logging System

## Overview

The Sent Emails Logging System automatically logs all emails sent through BlocIQ to a Supabase `sent_emails` table. This provides a complete audit trail of all outgoing communications with full context and metadata.

## Database Schema

### `sent_emails` Table

```sql
CREATE TABLE sent_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    building_id UUID REFERENCES buildings(id),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    outlook_id TEXT, -- Optional: returned message ID from Microsoft Graph
    related_incoming_email UUID REFERENCES incoming_emails(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Fields

- **`id`**: Unique identifier for each sent email
- **`user_id`**: Links to the authenticated user who sent the email
- **`to_email`**: Recipient email address
- **`subject`**: Email subject line
- **`body`**: Full email body content
- **`building_id`**: Optional association with a specific building
- **`sent_at`**: Timestamp when the email was sent
- **`outlook_id`**: Message ID from Microsoft Graph API (if sent via Outlook)
- **`related_incoming_email`**: Links to original incoming email if this is a reply

### Indexes

```sql
CREATE INDEX idx_sent_emails_user_id ON sent_emails(user_id);
CREATE INDEX idx_sent_emails_sent_at ON sent_emails(sent_at);
CREATE INDEX idx_sent_emails_building_id ON sent_emails(building_id);
CREATE INDEX idx_sent_emails_outlook_id ON sent_emails(outlook_id);
CREATE INDEX idx_sent_emails_related_incoming ON sent_emails(related_incoming_email);
```

## API Endpoint

### POST `/api/send-email`

**Request Body:**
```typescript
{
  emailId: string,      // ID of the original incoming email
  draft: string,        // Email body content
  buildingId?: string   // Optional building ID for context
}
```

**Response:**
```typescript
{
  status: "sent" | "failed",
  log_id: string,       // UUID of the logged sent email
  message: string,      // Human-readable status message
  outlook_message_id?: string  // Outlook message ID if sent via API
}
```

## Implementation Flow

### 1. Email Sending Process

```typescript
// Step 1: Get user session
const { data: { session } } = await supabase.auth.getSession();

// Step 2: Fetch original email
const { data: email } = await supabase
  .from('incoming_emails')
  .select('*')
  .eq('id', emailId)
  .single();

// Step 3: Send via Outlook API
const sendResponse = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: {
      subject: `RE: ${email.subject}`,
      body: { contentType: 'HTML', content: draft },
      toRecipients: [{ emailAddress: { address: email.from_email } }]
    }
  })
});
```

### 2. Logging Process

```typescript
// Step 4: Log to sent_emails table
const { data: sentEmailLog } = await supabase
  .from('sent_emails')
  .insert({
    user_id: session.user.id,
    to_email: email.from_email,
    subject: `RE: ${email.subject}`,
    body: draft,
    building_id: buildingId || null,
    outlook_id: outlookMessageId,
    related_incoming_email: emailId,
    sent_at: new Date().toISOString()
  })
  .select('id')
  .single();
```

### 3. Post-Send Updates

```typescript
// Step 5: Mark original as handled
await supabase
  .from('incoming_emails')
  .update({ 
    is_handled: true,
    handled_at: new Date().toISOString()
  })
  .eq('id', emailId);

// Step 6: Update email history
await supabase.from('email_history').insert({
  email_id: emailId,
  sent_text: draft,
});
```

## Security Features

### Row Level Security (RLS)

```sql
-- Users can only see their own sent emails
CREATE POLICY "Users can view own sent emails" ON sent_emails
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sent emails" ON sent_emails
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Error Handling

- **Silent Logging**: Logging failures don't affect email delivery
- **Authentication Required**: All operations require valid user session
- **Input Validation**: All inputs are validated and sanitized
- **Graceful Degradation**: System continues working even if logging fails

## React Components

### SentEmailsList Component

```typescript
import SentEmailsList from '@/components/SentEmailsList'

// Basic usage
<SentEmailsList />

// With custom props
<SentEmailsList limit={20} className="my-custom-class" />
```

**Features:**
- ✅ **Real-time Loading**: Shows loading states during data fetch
- 🔄 **Auto-refresh**: Refresh button to reload data
- 📅 **Smart Date Formatting**: Relative timestamps (Today, Yesterday, etc.)
- 🏗️ **Building Context**: Shows associated building names
- 📧 **Outlook Integration**: Badge for emails sent via Outlook
- 📝 **Content Preview**: Truncated email body preview

## Usage Examples

### 1. Send Email and Log

```typescript
const response = await fetch('/api/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emailId: 'incoming-email-uuid',
    draft: '<p>Thank you for your inquiry...</p>',
    buildingId: 'building-uuid'
  })
});

const result = await response.json();
console.log('Email logged with ID:', result.log_id);
```

### 2. Query Sent Emails

```typescript
const { data: sentEmails } = await supabase
  .from('sent_emails')
  .select(`
    *,
    buildings(name)
  `)
  .order('sent_at', { ascending: false })
  .limit(10);
```

### 3. Get Email Thread

```typescript
const { data: emailThread } = await supabase
  .from('sent_emails')
  .select('*')
  .eq('related_incoming_email', 'incoming-email-uuid')
  .order('sent_at', { ascending: true });
```

## Test Page

Visit `/test/sent-emails` to see:
- 📧 **Live Sent Emails**: Real-time list of sent emails
- 🛠️ **Technical Details**: Database schema and implementation
- 🔒 **Security Features**: RLS policies and authentication
- 📊 **API Documentation**: Request/response examples

## Benefits

### 1. **Complete Audit Trail**
- Track all outgoing communications
- Link replies to original emails
- Maintain conversation history

### 2. **Building Context**
- Associate emails with specific buildings
- Filter communications by property
- Maintain property-specific records

### 3. **Outlook Integration**
- Track emails sent via Microsoft Graph
- Maintain message IDs for future reference
- Enable advanced Outlook features

### 4. **User Accountability**
- Link all emails to authenticated users
- Maintain user-specific email history
- Enable user-based filtering and reporting

### 5. **Data Analytics**
- Analyze email patterns and volumes
- Track response times and handling
- Generate communication reports

## Setup Instructions

### 1. Create Database Table

Run the SQL script:
```bash
# Execute in Supabase SQL Editor
\i scripts/createSentEmailsTable.sql
```

### 2. Update Send Email API

The `/api/send-email` endpoint has been updated to include logging functionality.

### 3. Add Components

Import and use the `SentEmailsList` component where needed:
```typescript
import SentEmailsList from '@/components/SentEmailsList'
```

### 4. Test Functionality

Visit `/test/sent-emails` to verify the system is working correctly.

## Troubleshooting

### Common Issues

1. **Logging Errors**: Check Supabase logs for database errors
2. **RLS Policy Issues**: Ensure user is authenticated
3. **Outlook Integration**: Verify access token is valid
4. **Performance**: Monitor query performance with large datasets

### Debug Mode

Enable debug logging by checking browser console for detailed error messages and operation logs.

## Future Enhancements

### Planned Features

1. **Email Templates**: Track template usage in sent emails
2. **Attachment Logging**: Log file attachments and metadata
3. **Advanced Analytics**: Email performance metrics and insights
4. **Bulk Operations**: Mass email tracking and management
5. **Export Functionality**: Export sent email logs to CSV/PDF
6. **Search and Filter**: Advanced search capabilities
7. **Email Threading**: Better conversation thread management
8. **Integration APIs**: Webhook support for external systems

---

The Sent Emails Logging System provides comprehensive tracking and management of all outgoing communications in BlocIQ, ensuring complete transparency and accountability for all email interactions. 