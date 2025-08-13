# AI Conversational Memory System

## Overview

This implementation adds durable conversational memory to the "Ask Blociq" assistant, enabling the model to maintain context across multiple interactions and produce coherent outputs that reuse previous context without asking users to repeat themselves.

## Key Features

- **Threads**: Persistent conversations with unique `conversationId`
- **Short-term Memory**: Rolling summaries that keep prompt sizes manageable
- **Long-term Memory**: Extracted facts and preferences stored for reuse
- **Building-optional**: Works with or without building context
- **UI Controls**: Toggle for memory usage and new thread creation

## Database Schema

### Tables Created

1. **`ai_conversations`** - One per thread
   - `id`, `title`, `building_id`, `user_id`
   - `rolling_summary`, `created_at`, `updated_at`

2. **`ai_messages`** - Full conversation transcript
   - `id`, `conversation_id`, `role`, `content`, `metadata`, `created_at`

3. **`ai_memory`** - Durable facts and preferences
   - `id`, `scope` (global/building/conversation), `key`, `value`, `weight`

### Indexes and RLS
- Performance indexes on conversation_id and memory scope
- Row-level security policies for user data isolation

## Implementation Components

### 1. Core Libraries

#### `lib/ai/prompt.ts`
- `buildSystemPrompt()` - Creates system instructions with tone/style
- `buildChatPrompt()` - Combines context, facts, and recent turns

#### `lib/ai/memory.ts`
- `upsertConversation()` - Creates/retrieves conversation threads
- `appendMessage()` - Stores user/assistant messages
- `getRecentTurns()` - Retrieves last N conversation turns
- `summarizeThread()` - Updates rolling summary using OpenAI
- `extractFacts()` - Parses and stores durable facts
- `getDurableFacts()` - Retrieves relevant facts for context

### 2. Enhanced API Endpoint

#### `app/api/assistant-query/route.ts`
- **Enhanced** existing endpoint with memory support
- **Backward compatible** - existing functionality preserved
- **New parameters**: `conversationId`, `useMemory`
- **Memory flow**: Create thread → Load context → Build prompt → Store response → Update memory

### 3. UI Components

#### `app/ai-assistant/page.tsx`
- **New page** replacing redirect to `/home`
- **Authentication required** - redirects to login if not authenticated

#### `app/ai-assistant/AIAssistantClient.tsx`
- **Modern chat interface** with memory controls
- **Toggle**: "Use previous messages" (default: ON)
- **Button**: "New Thread" to start fresh conversations
- **Context display**: Shows memory usage (turns, facts)
- **File upload support** via existing ask-ai endpoint

#### `hooks/useAIConversation.ts`
- **Custom hook** for conversation state management
- **LocalStorage persistence** of conversation IDs
- **Error handling** and loading states

## Usage Examples

### EWS1 Form Scenario (Acceptance Test)

```javascript
// 1. Ask about EWS1 form
POST /api/assistant-query
{
  "userQuestion": "What is an EWS1 form?",
  "useMemory": true
}

// 2. Ask to write as notice (reuses EWS1 context)
POST /api/assistant-query
{
  "userQuestion": "write this as a notice to all leaseholders",
  "useMemory": true,
  "conversationId": "uuid-from-step-1"
}

// 3. Ask to turn into email (reuses both contexts)
POST /api/assistant-query
{
  "userQuestion": "turn that into an email to leaseholders",
  "useMemory": true,
  "conversationId": "uuid-from-step-1"
}
```

### Expected Behavior

1. **First response**: Explains EWS1 form (UK property context)
2. **Second response**: Produces structured notice using EWS1 facts
3. **Third response**: Drafts email variant without re-explaining EWS1

## Technical Details

### Memory Management

- **Rolling Summary**: ~200-300 words, updated after each interaction
- **Fact Extraction**: 3-8 key facts per interaction, stored by scope
- **Context Building**: Combines summary + facts + recent turns (max 8)
- **Token Budget**: Keeps prompts manageable for cost efficiency

### Prompt Structure

```
System: Blociq role + style + output format rules
User: Rolling context + Key facts + Recent turns + Current question
```

### Error Handling

- **Graceful degradation**: Falls back to non-memory mode if errors occur
- **Non-blocking**: Memory updates happen asynchronously
- **User feedback**: Clear error messages and retry options

## Testing

### Local Test Script

```bash
# Run the EWS1 memory test
node test-ews1-memory.js
```

### Manual Testing

1. Navigate to `/ai-assistant`
2. Ask: "What is an EWS1 form?"
3. Ask: "write this as a notice to all leaseholders"
4. Verify: Response uses EWS1 context without repetition
5. Ask: "turn that into an email to leaseholders"
6. Verify: Email format with same core facts

## Deployment

### Database Migration

```bash
# Apply the migration
psql -d your_database -f supabase/migrations/20250115000000_ai_conversational_memory.sql
```

### Environment Variables

Ensure these are set:
- `OPENAI_API_KEY` - For AI responses and summarization
- `SUPABASE_SERVICE_ROLE_KEY` - For memory operations
- `NEXT_PUBLIC_SUPABASE_URL` - For client operations

### Build and Deploy

```bash
npm run build
npm run start
```

## Performance Considerations

- **Memory updates**: Asynchronous, don't block user responses
- **Context limits**: Recent turns capped at 8, facts at 20
- **Summary length**: Target 200-300 words for token efficiency
- **Database queries**: Optimized with proper indexes

## Future Enhancements

- **File handling**: Extend assistant-query endpoint for document uploads
- **Building context**: Integrate with existing building data
- **Memory analytics**: Track memory usage and effectiveness
- **Advanced summarization**: More sophisticated context compression
- **Multi-modal memory**: Support for images and documents

## Troubleshooting

### Common Issues

1. **Memory not working**: Check user authentication and RLS policies
2. **Conversation lost**: Verify localStorage persistence
3. **Slow responses**: Check OpenAI API rate limits
4. **Database errors**: Verify migration applied and tables exist

### Debug Mode

Enable console logging in browser dev tools to see:
- Memory context updates
- Conversation ID persistence
- API request/response details

## Security

- **User isolation**: RLS policies ensure users only see their data
- **Input validation**: All user inputs sanitized
- **API rate limiting**: Consider implementing rate limiting for production
- **Data retention**: Consider implementing data cleanup policies

## Support

For issues or questions:
1. Check console logs for error details
2. Verify database schema and RLS policies
3. Test with the provided test script
4. Review OpenAI API quota and rate limits
