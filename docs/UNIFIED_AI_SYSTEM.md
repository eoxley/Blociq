# BlocIQ Unified AI System

## Overview

The BlocIQ Unified AI System consolidates all AI-driven functionality into a single, powerful engine that handles email drafting, rewriting, question answering, and document classification across the entire application.

## Key Features

### 🎯 **Unified Modes**
- **`ask`** - Answer questions using building context and document search
- **`generate_reply`** - Create new emails from scratch with tone control
- **`transform_reply`** - Edit existing drafts while preserving facts and structure
- **`classify_document`** - Analyze and categorize uploaded documents

### 🎭 **Tone Presets**
- **`Holding`** - Polite, concise status requests (max 150 words)
- **`SolicitorFormal`** - Legal language with legislation citations
- **`ResidentNotice`** - Clear, lease-obligation focused
- **`SupplierRequest`** - Direct scope descriptions with urgency
- **`CasualChaser`** - Light, friendly relationship maintenance

### 🧠 **Draft Memory System**
- Automatic saving of all generated emails
- Per-thread draft storage for seamless transformations
- Context preservation across edit sessions
- 30-day automatic cleanup of old drafts

### 🏢 **Smart Context Fetching**
- Building details (name, address, unit count)
- Leaseholder information (names, emails, phones)
- Compliance issues and due dates
- Related documents and emails
- Major works project status

### 🔒 **Guardrails & Compliance**
- UK English spelling enforcement
- MIH formatting standards
- Leasehold terminology compliance
- Placeholder detection for missing information
- GDPR-compliant data handling

## API Usage

### Unified AI Endpoint

```typescript
POST /api/ai
```

#### Request Body

```typescript
{
  mode: 'ask' | 'generate_reply' | 'transform_reply' | 'classify_document',
  input: string,                    // User's request/question
  threadId?: string,               // For transform mode
  tone?: Tone,                     // For generate_reply mode
  contextHints?: {
    building_id?: string,
    email_id?: string,
    document_ids?: string[],
    leaseholder_id?: string,
    unit_number?: string
  },
  emailData?: {                    // For generate_reply mode
    subject?: string,
    body?: string,
    from_email?: string,
    categories?: string[],
    flag_status?: string
  }
}
```

#### Response

```typescript
{
  success: boolean,
  content: string,                 // Generated content
  subject?: string,                // Extracted subject
  placeholders?: string[],         // Missing information
  context?: {
    building_name?: string,
    leaseholder_name?: string,
    sources?: string[]
  },
  draft_id?: string,               // Saved draft ID
  thread_id: string                // Thread identifier
}
```

## Frontend Integration

### AskBlocIQ Component Updates

The main AskBlocIQ component now includes:

1. **AI Mode Selector** - Choose between ask, generate, and transform modes
2. **Tone Picker** - Select appropriate tone for email generation
3. **Context Chips** - Visual display of available building/leaseholder context
4. **Transform Button** - One-click draft transformation
5. **Placeholder Handling** - Automatic detection and warning for missing info

### Usage Examples

#### Generate a Holding Email

```typescript
const response = await fetch('/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'generate_reply',
    input: 'Request update on LPE1 form completion',
    tone: 'Holding',
    contextHints: { building_id: 'building-123' }
  })
});
```

#### Transform Existing Draft

```typescript
const response = await fetch('/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'transform_reply',
    input: 'Make this more casual and friendly',
    threadId: 'thread-456',
    tone: 'CasualChaser'
  })
});
```

#### Ask Building-Specific Question

```typescript
const response = await fetch('/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'ask',
    input: 'What compliance items are overdue?',
    contextHints: { building_id: 'building-123' }
  })
});
```

## Database Schema

### ai_thread_drafts Table

```sql
CREATE TABLE ai_thread_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT NOT NULL,
    tone TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    building_id TEXT REFERENCES buildings(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Migration Guide

### From Old System

1. **Replace API calls**:
   - `/api/ask-ai` → `/api/ai` with `mode: 'ask'`
   - `/api/generate-reply` → `/api/ai` with `mode: 'generate_reply'`

2. **Update response handling**:
   - `data.response` → `data.content`
   - Check for `data.placeholders` array
   - Use `data.thread_id` for draft management

3. **Add tone selection**:
   - Include `tone` parameter for email generation
   - Handle tone-specific UI elements

### New Features to Implement

1. **Draft Memory**:
   - Save drafts after generation
   - Implement transform buttons
   - Show draft history

2. **Context Display**:
   - Add context chips to UI
   - Show building/leaseholder info
   - Display compliance alerts

3. **Placeholder Handling**:
   - Detect missing information
   - Show inline input fields
   - Validate before sending

## Testing

### Unit Tests

Run the test suite:

```bash
npm test test/ai-prompt-engine.test.ts
```

### E2E Test Scenarios

1. **Generate → Transform → Transform Back**:
   - Generate solicitor email
   - Transform to casual tone
   - Transform back to formal
   - Verify factual preservation

2. **Context Integration**:
   - Test building context fetching
   - Verify leaseholder information
   - Check compliance data inclusion

3. **Placeholder Detection**:
   - Test missing recipient detection
   - Verify building name detection
   - Check postcode validation

## Best Practices

### Prompt Engineering

1. **Be Specific**: Include building context and specific requirements
2. **Use Appropriate Tones**: Match tone to communication purpose
3. **Provide Context**: Include relevant document IDs and email history

### Error Handling

1. **Check Placeholders**: Always verify `data.placeholders` array
2. **Handle Transform Errors**: Check for existing drafts before transformation
3. **Validate Context**: Ensure building and leaseholder IDs are valid

### Performance

1. **Reuse Thread IDs**: Maintain conversation continuity
2. **Cache Context**: Store frequently accessed building information
3. **Batch Requests**: Combine multiple AI operations when possible

## Troubleshooting

### Common Issues

1. **"No previous draft found"**:
   - Ensure `threadId` is provided
   - Check if draft was saved successfully
   - Verify user permissions

2. **Missing Context**:
   - Check `building_id` parameter
   - Verify database connections
   - Review RLS policies

3. **Placeholder Detection**:
   - Review content for missing information
   - Check building and leaseholder data
   - Verify postcode format

### Debug Mode

Enable debug logging:

```typescript
// In development
console.log('AI Request:', request);
console.log('AI Response:', response);
console.log('Context Data:', context);
```

## Future Enhancements

1. **Multi-language Support** - Additional language models
2. **Advanced Context** - Real-time compliance updates
3. **Template Library** - Pre-built email templates
4. **Analytics Dashboard** - AI usage metrics and insights
5. **Custom Tones** - User-defined tone presets

## Support

For technical support or feature requests:

- **Documentation**: Check this guide and inline code comments
- **Issues**: Report bugs via GitHub issues
- **Questions**: Contact the development team
- **Training**: Request custom training sessions
