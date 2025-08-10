# Document Generation Modes Implementation Summary

## Overview
Extended the `/api/ask-blociq` endpoint to support new document generation modes: "letter", "email", "notice", "minutes", and "agenda", while retaining existing "general", "draft", and "triage" modes.

## New Modes Added

### Template-Driven Modes (letter, email, notice)
- **Purpose**: Generate documents using templates from `communication_templates` table
- **Input**: `template_hint`, `extra_fields`, building/leaseholder context
- **Output**: Rendered HTML with placeholder replacement
- **Features**:
  - Template selection via semantic matching
  - Dynamic placeholder replacement
  - Missing placeholder tracking
  - HTML sanitization
  - For email mode: automatic proposed action to send draft

### Minutes Mode
- **Purpose**: Generate structured meeting minutes from notes
- **Input**: `notes`, `date`, `attendees`, building context
- **Output**: JSON with structured minutes + HTML render
- **Features**:
  - Structured agenda and minutes sections
  - Attendee tracking
  - Summary generation
  - Clean HTML formatting

### Agenda Mode
- **Purpose**: Create meeting agendas with time allocations
- **Input**: `message`, `timebox_minutes`, building context
- **Output**: JSON with agenda items + HTML render
- **Features**:
  - Time allocation per agenda item
  - Professional formatting
  - Building context integration

## Files Created/Modified

### New Files
1. **`lib/ai/placeholderHelpers.ts`**
   - `buildPlaceholderMap()`: Fetches building/unit/leaseholder data
   - `findBestTemplate()`: Template selection with semantic matching
   - `replacePlaceholders()`: Dynamic placeholder replacement

2. **`test-document-modes.js`**
   - Comprehensive test suite for all new modes
   - Validates response structures and functionality

### Modified Files
1. **`app/api/ask-blociq/route.ts`**
   - Extended request/response interfaces
   - Added mode-specific parsing logic
   - Integrated template processing
   - Added document saving to `generated_documents`

2. **`lib/ai/systemPrompt.ts`**
   - Added mode-specific instructions
   - Document generation guidelines
   - JSON structure requirements

## Database Integration

### Tables Used
- **`communication_templates`**: Template storage and retrieval
- **`generated_documents`**: Saving all generated artifacts
- **`buildings`**: Building context for placeholders
- **`units`**: Unit-specific placeholders
- **`leaseholders`**: Leaseholder information
- **`ai_logs`**: Audit logging
- **`ai_log_citations`**: Citation tracking

### Generated Document Structure
```typescript
{
  ai_log_id: string,
  building_id: string,
  type: 'letter' | 'email' | 'notice' | 'minutes' | 'agenda',
  title: string,
  content: string, // HTML content
  metadata: {
    template_id?: number,
    placeholders_used?: string[],
    missing_placeholders?: string[],
    date?: string,
    attendees?: string[],
    agenda?: Array<{item: string, duration?: string}>,
    minutes?: Array<{item: string, notes: string}>,
    summary?: string,
    timebox_minutes?: number
  }
}
```

## Security & Quality

### HTML Sanitization
- All generated HTML is sanitized using `sanitizeHtml()`
- Removes potentially dangerous tags and attributes
- Ensures neutral, professional formatting

### Error Handling
- Graceful handling of missing templates
- Missing placeholder tracking (doesn't fail)
- Comprehensive try/catch blocks
- Detailed error logging

### Audit Trail
- All document generation logged to `ai_logs`
- Citations tracked in `ai_log_citations`
- Generated documents saved with full metadata

## API Usage Examples

### Letter Generation
```javascript
POST /api/ask-blociq
{
  "message": "Generate noise complaint letter",
  "mode": "letter",
  "building_id": "123",
  "template_hint": "noise complaint",
  "extra_fields": {
    "issue_date": "15/01/2024",
    "specific_issue": "Loud music after 11pm"
  }
}
```

### Minutes Generation
```javascript
POST /api/ask-blociq
{
  "message": "Generate meeting minutes",
  "mode": "minutes",
  "building_id": "123",
  "notes": "Discussed noise complaints...",
  "attendees": ["John Smith", "Jane Doe"],
  "date": "15/01/2024"
}
```

### Agenda Generation
```javascript
POST /api/ask-blociq
{
  "message": "Create monthly residents meeting agenda",
  "mode": "agenda",
  "building_id": "123",
  "timebox_minutes": 60
}
```

## Response Formats

### Template-Driven Modes
```typescript
{
  answer: string,
  title: string,
  template_id: number,
  placeholders_used: string[],
  missing_placeholders: string[],
  html: string,
  citations: Array<{document_id, chunk_id, snippet}>,
  proposed_actions: Array<{type, args}>
}
```

### Minutes Mode
```typescript
{
  answer: string,
  title: string,
  date: string,
  attendees: string[],
  agenda: Array<{item: string, duration?: string}>,
  minutes: Array<{item: string, notes: string}>,
  summary: string,
  html: string,
  citations: Array<{document_id, chunk_id, snippet}>
}
```

### Agenda Mode
```typescript
{
  answer: string,
  title: string,
  agenda: Array<{item: string, duration?: string}>,
  timebox_minutes: number,
  html: string,
  citations: Array<{document_id, chunk_id, snippet}>
}
```

## Testing

Run the test suite:
```bash
node test-document-modes.js
```

Tests cover:
- Template selection and placeholder replacement
- Minutes generation with structured output
- Agenda creation with time allocations
- Email mode with proposed actions
- Error handling and edge cases

## Future Enhancements

1. **Template Embeddings**: Store embeddings for better semantic matching
2. **Template Categories**: Add category-based template filtering
3. **Document Templates**: Support for more document types
4. **Batch Generation**: Generate multiple documents in one request
5. **Template Versioning**: Track template changes and versions
6. **Advanced Placeholders**: Support for conditional placeholders and loops

## Environment Variables Required

- `OPENAI_API_KEY`: For AI generation and embeddings
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase connection
- `SUPABASE_SERVICE_ROLE_KEY`: Database access
- `NEXT_PUBLIC_AI_ENABLED`: Feature flag control
