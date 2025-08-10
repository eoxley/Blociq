# Ask BlocIQ Implementation Summary

## Overview
Successfully implemented a unified "Ask BlocIQ" brain with retrieval (RAG), citations, tool-call logging, and inbox wiring. The system provides three modes: general, draft, and triage, with comprehensive audit logging and security features.

## 🏗️ Architecture Components

### 1. Retrieval Utility (`lib/ai/retrieve.ts`)
- **Function**: `retrieveContext({ query, buildingId, limit })`
  - Creates embeddings using OpenAI text-embedding-3-small
  - Calls Supabase RPC `search_doc_chunks` for hybrid search
  - Returns array of `{ id, document_id, building_id, content, score }`
- **Function**: `embedMissingChunks(limit = 500)`
  - Batch embeds chunks without embeddings
  - Updates embedding column for each row

### 2. Admin Embedding Endpoint (`app/api/admin/embed-chunks/route.ts`)
- **POST only** with server-side guard
- Checks `X-Admin-Secret` header for security
- Calls `embedMissingChunks(500)` and returns `{ embedded: number }`

### 3. Unified Brain Endpoint (`app/api/ask-blociq/route.ts`)
- **Accepts JSON body**:
  ```typescript
  {
    message: string;
    mode?: "general" | "draft" | "triage";
    building_id?: string;
    email_id?: string;
    leaseholder_id?: string;
    document_ids?: string[];
  }
  ```
- **Builds context** using existing `buildPrompt()` function
- **Retrieves relevant chunks** using `retrieveContext()`
- **Calls OpenAI** with system prompt and user message
- **Mode-specific parsing**:
  - `general`: Returns plain text/markdown answer
  - `draft`: Returns `{ subject, html_body }`
  - `triage`: Returns structured triage object
- **Comprehensive logging** to `ai_logs` and `ai_log_citations` tables

### 4. Tool Endpoints with Audit Logging

#### Send Email Tool (`app/api/tools/send-email/route.ts`)
- **Args**: `{ to, cc, subject, html_body, reply_to_id, save_to_drafts }`
- **Features**: HTML sanitization, Outlook integration
- **Returns**: `{ ok: true, mode: "draft" | "send", outlook_id }`

#### Create Task Tool (`app/api/tools/create-task/route.ts`)
- **Args**: `{ building_id, title, description, due_date, priority }`
- **Features**: Inserts into `building_todos` table
- **Returns**: Inserted task row

Both tools log to `ai_tool_calls` table with status tracking.

### 5. HTML Sanitization (`lib/ai/sanitizeHtml.ts`)
- **Function**: `sanitizeEmailHtml(html)`
- Removes dangerous tags and attributes
- Ensures safe email formatting
- Used before sending to Outlook

### 6. Enhanced System Prompt (`lib/ai/systemPrompt.ts`)
- **Updated with new requirements**:
  - Cite law only from uploaded materials
  - Say when data is missing
  - Use MIH style ("Kind regards" no comma)
  - UK leasehold terminology enforcement

## 🔗 Inbox Integration

### Updated Components:
1. **AIActionBar** (`app/(dashboard)/inbox/components/AIActionBar.tsx`)
   - Generate Reply: Calls `/api/ask-blociq` with `mode: "draft"`
   - Saves to Outlook drafts via `/api/tools/send-email`
   - Feature flag aware with `NEXT_PUBLIC_AI_ENABLED`

2. **TriageAssistant** (`app/(dashboard)/inbox/components/TriageAssistant.tsx`)
   - Individual email triage using `/api/ask-blociq` with `mode: "triage"`
   - Draft generation for each email
   - Progress tracking and error handling

### Feature Flag Implementation:
- All AI buttons respect `NEXT_PUBLIC_AI_ENABLED`
- Disabled buttons show tooltip "AI currently disabled"
- Graceful fallback when AI is disabled

## 📊 Database Schema Requirements

The implementation assumes these tables exist:
- `doc_chunks` - Document chunks with embeddings
- `ai_logs` - AI interaction logging
- `ai_log_citations` - Citation tracking
- `ai_tool_calls` - Tool execution audit
- `building_todos` - Task management
- RPC `search_doc_chunks` - Vector similarity search

## 🔒 Security & Error Handling

### Security Features:
- Server-side Supabase client with `SUPABASE_SERVICE_ROLE_KEY`
- HTML sanitization before email sending
- Admin secret validation for embedding endpoint
- Authentication checks on all endpoints

### Error Handling:
- Comprehensive try/catch blocks
- Structured JSON error responses
- Tool call logging even on failures
- Graceful degradation when services unavailable

## 🧪 Testing

### Test File: `test-ask-blociq.js`
Tests all major endpoints:
1. `/api/admin/embed-chunks` - Embedding generation
2. `/api/ask-blociq` mode:"draft" - Email draft generation
3. `/api/ask-blociq` mode:"triage" - Email triage
4. `/api/tools/create-task` - Task creation
5. `/api/tools/send-email` - Email sending

## 📝 Environment Variables

### Required:
- `OPENAI_API_KEY` - OpenAI API access
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side Supabase access
- `NEXT_PUBLIC_AI_ENABLED` - Feature flag for AI functionality

### Optional:
- `ADMIN_SECRET` - Admin endpoint security (defaults to 'blociq-admin-2024')

## 🎯 Key Features Delivered

✅ **Retrieval (RAG)**: Hybrid search via embeddings + text
✅ **Citations**: Automatic tracking of document sources
✅ **Tool-call logging**: Complete audit trail of AI actions
✅ **Inbox wiring**: Seamless integration with existing UI
✅ **Three modes**: General, draft, and triage
✅ **Security**: HTML sanitization and admin guards
✅ **Error handling**: Comprehensive error management
✅ **Feature flags**: Respects `NEXT_PUBLIC_AI_ENABLED`
✅ **Audit logging**: All interactions logged to database

## 🚀 Usage Examples

### Generate Email Draft:
```javascript
const response = await fetch('/api/ask-blociq', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Generate a professional email reply to a leaseholder complaint',
    mode: 'draft',
    building_id: 'building-123'
  })
});
```

### Triage Email:
```javascript
const response = await fetch('/api/ask-blociq', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Triage this inbox thread about maintenance',
    mode: 'triage',
    building_id: 'building-123',
    email_id: 'email-456'
  })
});
```

### Create Task:
```javascript
const response = await fetch('/api/tools/create-task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    building_id: 'building-123',
    title: 'Follow up on maintenance request',
    priority: 'Medium'
  })
});
```

## 🔄 Migration Notes

1. **Database**: Ensure new tables (`doc_chunks`, `ai_log_citations`, `ai_tool_calls`) exist
2. **RPC**: Verify `search_doc_chunks` function is available
3. **Environment**: Set required environment variables
4. **Feature Flag**: Set `NEXT_PUBLIC_AI_ENABLED=true` to enable AI features

## 📈 Performance Considerations

- **Batch embedding**: Processes 500 chunks at a time
- **Vector search**: Uses Supabase RPC for efficient similarity search
- **Caching**: Consider implementing response caching for repeated queries
- **Rate limiting**: Monitor OpenAI API usage and implement rate limiting if needed

The implementation provides a robust, secure, and scalable AI system that integrates seamlessly with the existing BlocIQ platform while maintaining comprehensive audit trails and user control through feature flags.
