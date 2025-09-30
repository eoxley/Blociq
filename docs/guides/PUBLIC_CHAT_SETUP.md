# Public Chat Setup Guide

## Environment Variables Required

Add these to your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Supabase Service Role Key (server-only, keep secret!)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

## Database Migration

Run the Supabase migration to create the required tables:

```sql
-- Run this in your Supabase SQL editor
-- File: supabase/migrations/20241201000000_add_public_chat_tables.sql
```

## Features Implemented

### 1. Lead Capture
- Email collection with marketing consent
- Automatic upsert to prevent duplicates
- Source tracking for analytics

### 2. Chat Session Management
- One session per unlocked chat
- Persistent across browser sessions
- Automatic cleanup of old sessions

### 3. Message Logging
- Every user and assistant message logged
- Token count tracking (optional)
- Fire-and-forget logging (doesn't block UX)

### 4. Integration Points

#### PublicAskBlocIQ Component
- ✅ Email capture with consent
- ✅ Session creation on unlock
- ✅ Message logging for all chat turns
- ✅ Session persistence

#### EmailConsentModal Component
- ✅ Updated to create sessions
- ✅ Passes session ID to parent components

## Usage

### Starting a Session
```typescript
import { startPublicChat } from '@/lib/publicChatClient';

const sessionId = await startPublicChat(email, marketingConsent);
```

### Logging Messages
```typescript
import { logPublicChatMessage } from '@/lib/publicChatClient';

// Log user message
await logPublicChatMessage(sessionId, 'user', userMessage);

// Log assistant response
await logPublicChatMessage(sessionId, 'assistant', aiResponse, tokenCount);
```

### Checking Existing Sessions
```typescript
import { getExistingSession, getExistingEmail } from '@/lib/publicChatClient';

const existingSession = getExistingSession();
const existingEmail = getExistingEmail();
```

## API Endpoints

- `POST /api/public-chat/start` - Start a new chat session
- `POST /api/public-chat/message` - Log a chat message

## Database Schema

### leads
- `id` (uuid, primary key)
- `email` (text, unique)
- `marketing_consent` (boolean)
- `source` (text, default: 'landing_public_chat')
- `created_at` (timestamptz)

### chat_sessions
- `id` (uuid, primary key)
- `email` (text)
- `lead_id` (uuid, foreign key to leads)
- `source` (text, default: 'landing_public_chat')
- `user_agent` (text)
- `started_at` (timestamptz)

### chat_messages
- `id` (bigserial, primary key)
- `session_id` (uuid, foreign key to chat_sessions)
- `role` (text, check: 'user', 'assistant', 'system')
- `content` (text)
- `token_count` (int, nullable)
- `created_at` (timestamptz)

## Security Notes

- All database operations use service role key (server-side only)
- No client-side database access
- RLS remains enabled (service role bypasses RLS)
- Email validation on both client and server
- Fire-and-forget logging prevents UX blocking
