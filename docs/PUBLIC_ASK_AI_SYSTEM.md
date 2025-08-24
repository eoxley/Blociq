# Public Ask AI System - Enhanced Landing Page AI

## Overview

The enhanced public Ask AI system provides **all the main Ask AI features** to landing page users without requiring authentication or access to Supabase contextual data. This allows potential customers to experience the full power of BlocIQ's AI assistant before signing up.

## Key Features

### ✅ **Available Features (Same as Main System)**
- **Advanced Context Types**: General, Email Reply, Major Works, Compliance, Leaseholder, Leak Triage
- **Tone Control**: Professional, Friendly, Firm email responses
- **Smart Context Detection**: Auto-detects query type and applies appropriate expertise
- **Leak Triage Policy**: Full UK long-lease block leak management guidance
- **Professional Email Drafting**: UK property management email templates
- **Major Works Guidance**: Section 20 processes and project management
- **Compliance Expertise**: UK building regulations and safety standards
- **Leaseholder Relations**: Service charges, maintenance, and communication
- **Enhanced Prompts**: Context-aware prompt building for better responses
- **1500 Token Limit**: Increased from 1000 for more comprehensive answers

### ❌ **Not Available (Security & Data Protection)**
- Building-specific data
- Document analysis
- Leaseholder information
- Email thread context
- Compliance records
- Major works project data
- User-specific context
- Database searches

## Architecture

### Endpoint
```
POST /api/ask-ai-public
```

### Request Format
```typescript
{
  prompt: string,           // User question
  question?: string,        // Backward compatibility
  context_type?: string,    // Optional: general, email_reply, major_works, compliance, leaseholder
  tone?: string,           // Optional: Professional, Friendly, Firm (for email replies)
  building_id?: string,    // Ignored (always null for public)
  is_public?: boolean      // Always true for this endpoint
}
```

### Response Format
```typescript
{
  success: boolean,
  result: string,          // AI response
  response: string,        // Backward compatibility
  context_type: string,    // Detected or specified context type
  building_id: null,       // Always null for public endpoint
  document_count: 0,       // Always 0 for public endpoint
  has_email_thread: false, // Always false for public endpoint
  has_leaseholder: false,  // Always false for public endpoint
  context: {
    complianceUsed: boolean,
    majorWorksUsed: boolean,
    leakTriageUsed: boolean,
    emailReplyUsed: boolean,
    publicAccess: true
  },
  metadata: {
    contextType: string,
    tone: string,
    isPublic: true,
    enhancedPrompt: string
  }
}
```

## Context Types

### 1. **General** (Default)
- Property management best practices
- UK regulations and standards
- Operational guidance
- Industry insights

### 2. **Email Reply**
- Professional email drafting
- Tone control (Professional/Friendly/Firm)
- UK property management context
- British English usage

### 3. **Major Works**
- Section 20 processes
- Project planning guidance
- Cost analysis support
- UK building regulations

### 4. **Compliance**
- Health and safety guidance
- Fire safety standards
- Building regulations
- Compliance tracking

### 5. **Leaseholder**
- Service charge guidance
- Maintenance best practices
- Communication strategies
- UK leasehold law

### 6. **Leak Triage** (Auto-detected)
- Full leak management policy
- Demised vs communal guidance
- Cost liability rules
- Insurance considerations

## Smart Context Detection

The system automatically detects context from user queries:

```typescript
// Examples of auto-detection:
"water leak from ceiling" → leak_triage
"draft email response" → email_reply
"Section 20 notice" → major_works
"fire safety compliance" → compliance
"service charge query" → leaseholder
```

## Components Using Public Endpoint

### 1. **PublicAskBlocIQ** (Landing Page Widget)
- **File**: `components/assistant/PublicAskBlocIQ.tsx`
- **Usage**: Fixed brain icon button on landing page
- **Features**: File uploads, chat interface, session management

### 2. **AskBlocIQHomepage** (Homepage AI)
- **File**: `components/AskBlocIQHomepage.tsx`
- **Usage**: Homepage AI assistant
- **Features**: Public access, basic property advice

### 3. **AskBlocIQ** (Conditional Public)
- **File**: `components/assistant/AskBlocIQ.tsx`
- **Usage**: Uses public endpoint when `isPublic={true}`
- **Features**: Conditional endpoint selection

## Security Features

### Data Isolation
- **No Supabase Access**: Completely isolated from database
- **No User Data**: No access to authenticated user information
- **No Building Context**: No building-specific data exposure
- **Public Only**: Always operates in public mode

### Input Validation
- **Question Required**: Validates prompt/question presence
- **Size Limits**: 1500 token response limit
- **Sanitization**: Basic input validation and sanitization

## Performance & Scalability

### OpenAI Integration
- **Model**: GPT-4
- **Temperature**: 0.3 (consistent, professional responses)
- **Token Limit**: 1500 (comprehensive answers)
- **Rate Limiting**: Handles OpenAI API limits gracefully

### Response Optimization
- **Context-Aware**: Only includes relevant system prompts
- **Smart Prompting**: Builds enhanced prompts based on context
- **Efficient Processing**: Minimal overhead for public requests

## Usage Examples

### Basic Property Question
```typescript
POST /api/ask-ai-public
{
  "prompt": "What are the key compliance requirements for residential properties?"
}
```

### Email Reply Generation
```typescript
POST /api/ask-ai-public
{
  "prompt": "Draft a professional email to a leaseholder about noise complaints",
  "context_type": "email_reply",
  "tone": "Professional"
}
```

### Leak Management
```typescript
POST /api/ask-ai-public
{
  "prompt": "How should I handle a ceiling leak between flats?"
}
// Automatically detected as leak_triage context
```

## Monitoring & Logging

### Request Logging
- **Public Usage Tracking**: Logs all public AI requests
- **Context Detection**: Records detected context types
- **Response Metrics**: Tracks response lengths and success rates
- **Error Handling**: Comprehensive error logging

### Analytics
- **Usage Patterns**: Track popular query types
- **Performance Metrics**: Monitor response times and quality
- **User Engagement**: Measure landing page AI usage
- **Conversion Tracking**: Link AI usage to sign-ups

## Future Enhancements

### Planned Features
- **File Upload Support**: PDF and document analysis (without database storage)
- **Enhanced Context Types**: More specialized property management areas
- **Response Templates**: Pre-built response templates for common queries
- **Multi-language Support**: Additional language support for UK market

### Integration Opportunities
- **Landing Page Analytics**: Track AI usage impact on conversions
- **Lead Generation**: Capture interested users through AI interactions
- **Product Demos**: Showcase AI capabilities to potential customers
- **Customer Education**: Provide value before sign-up

## Troubleshooting

### Common Issues
1. **Context Type Not Detected**: Check query keywords and context
2. **Response Quality**: Verify prompt clarity and specificity
3. **Rate Limiting**: Monitor OpenAI API usage and limits
4. **Error Responses**: Check logs for detailed error information

### Debug Mode
- **Console Logging**: Comprehensive request/response logging
- **Context Detection**: Logs detected context types
- **Prompt Building**: Shows enhanced prompt construction
- **Response Metadata**: Includes response analysis information

## Conclusion

The enhanced public Ask AI system provides landing page users with a **full-featured AI experience** that showcases BlocIQ's capabilities while maintaining complete data security. Users can experience professional property management AI assistance without any authentication requirements, helping to convert visitors into customers through value demonstration.
