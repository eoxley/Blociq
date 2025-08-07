# Unified AI System Documentation

## Overview

The BlocIQ AI system has been unified into a single endpoint (`/api/ask-ai`) that handles all AI functionality across the application. This ensures consistent behavior, proper logging, and centralized context management.

## Unified Endpoint: `/api/ask-ai`

### Features
- **Single Entry Point**: All AI requests go through one endpoint
- **Comprehensive Context**: Building data, documents, emails, leaseholders
- **Public Access**: Supports unauthenticated requests for general questions
- **File Uploads**: Handles document uploads for analysis
- **Email Reply Generation**: Specialized mode for email responses
- **Consistent Logging**: All interactions logged to `ai_logs` table
- **GDPR Compliance**: Respects user permissions and data protection

### Request Format

#### JSON Request
```typescript
{
  prompt: string,           // The user's question
  building_id?: string,     // Building context (optional)
  document_ids?: string[],  // Document IDs for analysis
  leaseholder_id?: string,  // Leaseholder context
  context_type?: string,    // 'general', 'email_reply', 'major_works'
  tone?: string,           // 'Professional', 'Friendly', 'Firm' (for emails)
  is_public?: boolean      // For public access (no auth required)
}
```

#### FormData Request (with file uploads)
```typescript
FormData {
  message: string,          // The user's question
  building_id?: string,     // Building context
  file: File[],            // Uploaded files
  context_type?: string,   // Context type
  tone?: string           // Email tone
}
```

### Response Format
```typescript
{
  success: boolean,
  response: string,        // AI response
  result: string,          // Backward compatibility
  context_type: string,    // Type of context used
  building_id: string,     // Building ID used
  document_count: number,  // Number of documents analyzed
  has_email_thread: boolean,
  has_leaseholder: boolean,
  context: {
    complianceUsed: boolean,
    majorWorksUsed: boolean
  },
  metadata: object         // Additional context metadata
}
```

## Components Using Unified Endpoint

### 1. AskBlocIQ (Main AI Component)
- **Endpoint**: `/api/ask-ai`
- **Context**: Building data, documents, leaseholders
- **Features**: File uploads, document analysis, suggested actions

### 2. AskBlocIQHomepage (Public AI)
- **Endpoint**: `/api/ask-ai` with `is_public: true`
- **Context**: General property management (no building context)
- **Features**: Public access, basic property advice

### 3. FloatingBlocIQ (Floating Assistant)
- **Endpoint**: `/api/ask-ai`
- **Context**: Building data, file uploads
- **Features**: Drag-and-drop files, comprehensive context

### 4. ReplyModal (Email Reply Generation)
- **Endpoint**: `/api/ask-ai` with `context_type: 'email_reply'`
- **Context**: Email content, building data, tone control
- **Features**: Professional email drafting, tone selection

### 5. DocumentAwareAI (Document Analysis)
- **Endpoint**: `/api/ask-ai`
- **Context**: Document content, building data
- **Features**: Document-specific questions, text analysis

## Context Types

### `general`
- Default context type
- Includes building data, compliance, todos, leaseholders
- Used for general property management questions

### `email_reply`
- Specialized for email response generation
- Includes email thread context
- Tone control (Professional, Friendly, Firm)
- Building context for personalized responses

### `major_works`
- Specialized for major works projects
- Includes project data, timelines, costs
- Used in major works pages

### `public`
- For unauthenticated users
- General property management advice
- No building-specific context
- GDPR-safe responses

## Logging and Analytics

### AI Logs Table
All AI interactions are logged to the `ai_logs` table:

```sql
CREATE TABLE ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  context_type TEXT DEFAULT 'general',
  building_id INTEGER REFERENCES buildings(id),
  document_ids TEXT[],
  leaseholder_id UUID REFERENCES leaseholders(id),
  email_thread_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Logged Data
- User ID (for authenticated requests)
- Question and response
- Context type and building ID
- Document IDs analyzed
- Email thread information
- Timestamp

## Security and Privacy

### Authentication
- **Authenticated Requests**: Full access to building data and context
- **Public Requests**: General property advice only, no building data

### GDPR Compliance
- User permissions respected
- Building access controlled by RLS policies
- Leaseholder data only shared when appropriate
- No sensitive data in public responses

### Data Protection
- All requests logged for audit purposes
- Building context only included when user has access
- Document analysis respects user permissions
- Email content handled securely

## Migration Guide

### For Developers

#### Updating Components
1. Change endpoint from specific AI endpoint to `/api/ask-ai`
2. Update request format to match unified structure
3. Update response handling to use unified format
4. Add appropriate context_type and other parameters

#### Example Migration
```typescript
// Before (multiple endpoints)
const response = await fetch('/api/ask-blociq', {
  method: 'POST',
  body: JSON.stringify({ question, buildingId })
});

// After (unified endpoint)
const response = await fetch('/api/ask-ai', {
  method: 'POST',
  body: JSON.stringify({ 
    prompt: question, 
    building_id: buildingId,
    context_type: 'general'
  })
});
```

### Response Handling
```typescript
// Unified response format
const data = await response.json();
if (data.success) {
  const aiResponse = data.response; // or data.result for backward compatibility
  // Handle response...
}
```

## Benefits of Unified System

### 1. Consistency
- All AI responses use the same logic and context
- Consistent error handling and logging
- Uniform response format across all components

### 2. Maintainability
- Single endpoint to maintain and update
- Centralized context building logic
- Unified logging and analytics

### 3. Performance
- Reduced API complexity
- Shared caching and optimization
- Efficient context building

### 4. Security
- Centralized authentication and authorization
- Consistent GDPR compliance
- Unified audit logging

### 5. User Experience
- Consistent AI behavior across all features
- Reliable context awareness
- Professional response quality

## Future Enhancements

### Planned Features
1. **Advanced Context Building**: More sophisticated context assembly
2. **Response Caching**: Cache common responses for performance
3. **Multi-language Support**: International property management
4. **Advanced Analytics**: Detailed usage analytics and insights
5. **Custom Prompts**: User-defined prompt templates

### Technical Improvements
1. **Streaming Responses**: Real-time AI response streaming
2. **Context Optimization**: Smarter context selection
3. **Response Quality**: Enhanced response accuracy and relevance
4. **Integration APIs**: Third-party system integrations

## Troubleshooting

### Common Issues

#### 1. Authentication Errors
- Ensure user is logged in for building-specific requests
- Use `is_public: true` for general questions

#### 2. Context Issues
- Verify building_id is correct
- Check user permissions for building access
- Ensure document_ids are valid

#### 3. Response Quality
- Provide clear, specific prompts
- Include relevant context parameters
- Use appropriate context_type

#### 4. Performance Issues
- Limit document_ids to necessary documents
- Use appropriate context_type
- Consider response caching for repeated questions

## Support

For technical support or questions about the unified AI system:
- Check the API documentation
- Review the ai_logs table for request history
- Contact the development team for complex issues
