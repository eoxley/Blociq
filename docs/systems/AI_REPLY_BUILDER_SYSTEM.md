# BlocIQ AI-Powered Reply Builder System

## Overview

The AI Reply Builder system allows property managers to generate, edit, and send AI-drafted replies to any synced email in the inbox, using building context and previous correspondence. This creates a complete communications workflow from inbox to sent reply.

## Features

### 🧠 AI-Powered Draft Generation
- **Context-Aware**: Uses building information, leaseholder details, and email history
- **Tone Control**: Professional, Friendly, or Firm tone options
- **Building Integration**: Pulls building name, unit info, and known contacts
- **Thread Awareness**: Considers previous messages in the email thread

### 📧 Reply Modal Interface
- **Original Email Preview**: Shows the email being replied to
- **AI Draft Field**: Pre-filled with generated response
- **Editable Text Area**: Full editing capabilities before sending
- **Regenerate Option**: Generate new drafts with different approaches
- **Building Context Display**: Shows relevant building information

### 📨 Send & Track System
- **Multiple Send Methods**: Microsoft Graph API with SMTP fallback
- **Reply Tracking**: Logs all sent replies in `outgoing_emails` table
- **Status Updates**: Marks original emails as "handled"
- **Communications Log**: Integrates with existing communications system
- **Attachment Support**: Can include document attachments

## API Endpoints

### `/api/generate-reply`
Generates AI-powered email replies with building context.

**Request:**
```typescript
{
  emailId: string,
  buildingId?: string,
  history?: string[],  // previous messages in thread
  senderName: string,
  emailBody: string,
  tone?: "Professional" | "Friendly" | "Firm"
}
```

**Response:**
```typescript
{
  success: boolean,
  draft: string,
  buildingContext?: string
}
```

### `/api/send-reply`
Sends email replies and logs them in the system.

**Request:**
```typescript
{
  reply_to_message_id: string,
  reply_text: string,
  to: string[],
  cc?: string[],
  building_id?: string,
  user_id: string,
  attachment_path?: string,
  subject?: string
}
```

**Response:**
```typescript
{
  success: boolean,
  messageId: string,
  subject: string
}
```

## Database Schema

### `outgoing_emails` Table
```sql
CREATE TABLE outgoing_emails (
    id UUID PRIMARY KEY,
    message_id TEXT UNIQUE NOT NULL,
    reply_to_message_id TEXT REFERENCES incoming_emails(message_id),
    to_emails TEXT[] NOT NULL,
    cc_emails TEXT[] DEFAULT '{}',
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    building_id UUID REFERENCES buildings(id),
    sent_by UUID REFERENCES auth.users(id),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attachment_path TEXT,
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Enhanced `incoming_emails` Table
```sql
-- Added columns for reply tracking
ALTER TABLE incoming_emails ADD COLUMN status TEXT DEFAULT 'unread';
ALTER TABLE incoming_emails ADD COLUMN handled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE incoming_emails ADD COLUMN handled_by UUID REFERENCES auth.users(id);
```

## Components

### `ReplyModal.tsx`
Main modal component for the reply interface.

**Features:**
- Split-pane layout (original email + reply editor)
- AI draft generation with tone control
- Building context display
- Send functionality with status tracking

**Props:**
```typescript
interface ReplyModalProps {
  email: Email;
  isOpen: boolean;
  onClose: () => void;
  onReplySent: () => void;
}
```

### Email Detail Page (`/dashboard/inbox/[id]/page.tsx`)
Full email view with reply functionality.

**Features:**
- Complete email display
- Building information
- Quick action buttons
- Reply modal integration

## Usage Workflow

### 1. Access Email Detail
1. Navigate to `/dashboard/inbox`
2. Click on any email to view details
3. Or click the "Reply" button for quick access

### 2. Generate AI Draft
1. Click "Reply" button
2. Select desired tone (Professional/Friendly/Firm)
3. AI generates context-aware draft
4. Review and edit as needed

### 3. Send Reply
1. Finalize reply text
2. Click "Send Reply"
3. System sends email and logs it
4. Original email marked as "handled"

## AI Prompt Engineering

### System Prompt
```
You are Ellie Oxley, a professional UK block manager at BlocIQ. You draft clear, helpful, and leaseholder-focused email replies.

Key principles:
- Always be polite and professional
- Address the leaseholder's concerns directly
- Provide clear next steps when possible
- Use appropriate UK property management terminology
- Keep responses concise but comprehensive
- Sign off as "Ellie Oxley, BlocIQ"
```

### Context Injection
The AI receives:
- Original email content
- Building information (name, address, units)
- Email thread history
- Sender details
- Selected tone preference

## Security & Permissions

### Row Level Security (RLS)
- Users can only view/send emails for buildings they have access to
- Outgoing emails are restricted to user's building permissions
- Audit trail maintained for all sent communications

### Data Privacy
- Email content encrypted in transit
- Building context only shared for authorized properties
- User actions logged for compliance

## Integration Points

### Communications System
- Sent replies logged in `communications_sent` table
- Integrates with existing communications tracking
- Supports document attachments and templates

### Building Management
- Pulls building context for personalized responses
- Links replies to specific properties
- Maintains leaseholder relationship data

### Email Sync
- Works with existing email sync system
- Updates email status after reply
- Maintains thread continuity

## Future Enhancements

### Planned Features
- **Follow-up Suggestions**: AI suggests next actions after replies
- **Template Integration**: Use existing letter templates in replies
- **Bulk Reply**: Handle multiple similar emails
- **Analytics**: Track reply effectiveness and response times
- **Auto-categorization**: Automatically categorize incoming emails

### Advanced AI Features
- **Sentiment Analysis**: Detect leaseholder mood and adjust tone
- **Priority Detection**: Identify urgent vs. routine inquiries
- **Compliance Checking**: Ensure replies meet regulatory requirements
- **Multi-language Support**: Handle emails in different languages

## Error Handling

### Common Scenarios
- **Email Not Found**: Graceful fallback with user notification
- **Send Failure**: Retry logic with SMTP fallback
- **AI Generation Error**: Default professional template
- **Permission Denied**: Clear error messages for unauthorized access

### Monitoring
- All API calls logged for debugging
- Error rates tracked for system health
- User feedback collected for improvements

## Performance Considerations

### Optimization
- AI responses cached for similar queries
- Database queries optimized with proper indexing
- Email content compressed for storage efficiency
- Background processing for non-critical operations

### Scalability
- Horizontal scaling support for high email volumes
- Rate limiting for AI API calls
- Queue system for bulk operations
- CDN integration for attachment delivery

## Testing

### Test Scenarios
- Generate replies for different email types
- Test tone variations and building contexts
- Verify send functionality with various recipients
- Check error handling and edge cases
- Validate RLS policies and permissions

### Sample Test Data
```typescript
const testEmail = {
  message_id: "test_123",
  subject: "Service Charge Query",
  from_email: "leaseholder@example.com",
  body: "When will I receive my service charge invoice?",
  building_id: "building_123"
};
```

## Deployment

### Environment Variables
```bash
OPENAI_API_KEY=your_openai_key
MICROSOFT_GRAPH_CLIENT_ID=your_graph_client_id
MICROSOFT_GRAPH_CLIENT_SECRET=your_graph_secret
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

### Database Migration
```bash
# Run the migration script
psql -d your_database -f scripts/createOutgoingEmailsTable.sql
```

This system transforms BlocIQ into a complete AI-powered communications engine, handling both inbound and outbound emails with professional consistency and comprehensive tracking. 