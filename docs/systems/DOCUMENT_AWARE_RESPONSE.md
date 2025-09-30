# Document-Aware Response System

## Overview

The Document-Aware Response System provides ChatGPT-style interactions with uploaded documents, allowing users to ask questions about their documents and receive intelligent, contextual responses. The system automatically identifies relevant documents, extracts information, and provides comprehensive answers.

## Features

### 1. Intelligent Document Selection
- **Latest Document Priority**: Automatically selects the most recent relevant document
- **Type Filtering**: Can filter by document type (Fire Risk Assessment, Lease, etc.)
- **Building Context**: Respects user's building access permissions
- **Multiple Document Support**: Can compare multiple documents when requested

### 2. ChatGPT-Style Interface
- **Real-time Chat**: Interactive chat interface with message history
- **Quick Actions**: Pre-built question buttons for common queries
- **Document Context**: Shows which document was analyzed in responses
- **Loading States**: Visual feedback during processing

### 3. Advanced AI Responses
- **Contextual Answers**: Responses based on actual document content
- **Structured Output**: Organized responses with summaries, actions, and deadlines
- **Comparison Support**: Can compare documents when requested
- **Multi-document Analysis**: Handles questions across multiple documents

## System Architecture

### API Endpoint

#### `/api/ask-document` (POST)
Handles document-aware questions and provides intelligent responses.

**Request:**
```typescript
{
  question: string
  buildingId?: string
  documentType?: string
  userId: string
}
```

**Response:**
```typescript
{
  answer: string
  document_analyzed: {
    id: string
    name: string
    type: string
    uploaded_at: string
    building_name: string
  }
  documents_found: number
  total_documents: number
}
```

### Database Tables

#### `document_analysis`
Stores extracted text and summaries for quick access:
```sql
CREATE TABLE document_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES building_documents(id) ON DELETE CASCADE,
  extracted_text TEXT,
  summary TEXT,
  extracted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `document_queries`
Logs all document queries for analytics and improvement:
```sql
CREATE TABLE document_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  document_id UUID REFERENCES building_documents(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Usage Examples

### Basic Questions
```
User: "Summarize this document"
AI: "Based on the uploaded document titled 'Ashwood_FRA_2024.pdf':

Summary:
This Fire Risk Assessment was conducted on 24 April 2024 by FireSafe Ltd. It identified 3 key moderate risks in communal areas, including fire door damage on the 3rd floor and obstructed escape routes near the lift shaft.

Required Actions:
• Replace damaged fire door by 30 May 2024
• Clear obstructions from escape route (ongoing monitoring)
• Install fire safety signage in bin store area

Assigned to: FireSafe Ltd
Review Date: April 2025"
```

### Action Extraction
```
User: "What are the key actions?"
AI: "Based on the Fire Risk Assessment document:

Key Actions Required:

1. IMMEDIATE (Due: 30 May 2024)
   • Replace damaged fire door on 3rd floor
   • Clear obstructions from escape route near lift shaft

2. ONGOING
   • Monitor escape route obstructions
   • Regular fire safety inspections

3. SHORT TERM
   • Install fire safety signage in bin store area
   • Update emergency lighting system

Responsible Parties:
• FireSafe Ltd (main contractor)
• Building management team (ongoing monitoring)

Priority: High - Fire safety compliance issue"
```

### Comparison Questions
```
User: "Compare this with the previous version"
AI: "Comparing the current Fire Risk Assessment (April 2024) with the previous version (April 2023):

Key Changes:

CURRENT VERSION (2024):
• 3 moderate risks identified (down from 5 in 2023)
• New issue: Fire door damage on 3rd floor
• Ongoing: Escape route obstructions (improved from 2023)

PREVIOUS VERSION (2023):
• 5 moderate risks identified
• No fire door damage reported
• Multiple escape route issues

Progress Made:
✅ Reduced total risks from 5 to 3
✅ Improved escape route conditions
⚠️ New issue: Fire door damage (requires immediate attention)

Compliance Status: Improving but requires immediate action on fire door replacement."
```

## Component Structure

### DocumentChat Component
```typescript
interface DocumentChatProps {
  buildingId?: string;
  onDocumentSelect?: (documentId: string) => void;
}
```

**Features:**
- Real-time chat interface
- Document type filtering
- Quick action buttons
- Message history
- Loading states
- Document context display

### Integration with Documents Page
The DocumentChat component is integrated into the documents page with tabs:
- **Upload & Analyze**: Original document upload functionality
- **Document Assistant**: New chat interface for document queries

## Security & Permissions

### Row Level Security (RLS)
- Users can only access documents for buildings they have permission to view
- Document queries are logged per user
- Building access is validated for all operations

### Data Privacy
- Document text is stored securely in the database
- Query history is user-specific
- No document content is shared between users

## Performance Optimizations

### Caching Strategy
- Extracted text is stored in `document_analysis` table
- Avoids re-extraction of text for repeated queries
- Document analysis is cached per document

### Query Optimization
- Indexes on frequently queried fields
- Limited document selection (latest 5)
- Efficient text extraction from stored files

## Error Handling

### Common Scenarios
1. **No Documents Found**: Clear message with guidance
2. **Text Extraction Failed**: Fallback to basic document info
3. **AI Processing Error**: Graceful error message
4. **Permission Denied**: Clear access control message

### Fallback Behavior
- If AI analysis fails, provides basic document information
- If text extraction fails, uses document metadata
- System continues to work even with partial failures

## Setup Instructions

### 1. Database Setup
Run the SQL script to create required tables:
```bash
# Execute the SQL script
psql -d your_database -f scripts/createDocumentTables.sql
```

### 2. Environment Variables
Ensure these are configured:
```bash
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Storage Bucket
Ensure the `building-documents` bucket exists in Supabase storage.

### 4. RLS Policies
The SQL script includes all necessary RLS policies for security.

## Usage Guidelines

### Best Practices
1. **Clear Questions**: Ask specific questions for better responses
2. **Document Organization**: Keep documents well-organized by type
3. **Regular Updates**: Upload new versions to enable comparisons
4. **Building Context**: Use building-specific queries when relevant

### Question Types
- **Summary**: "Summarize this document"
- **Actions**: "What are the key actions?"
- **Deadlines**: "What are the deadlines?"
- **Responsibility**: "Who is responsible?"
- **Comparison**: "Compare with previous version"
- **Compliance**: "What are the compliance requirements?"

## Analytics & Insights

### Query Logging
All document queries are logged for:
- Usage analytics
- System improvement
- User behavior insights
- Performance monitoring

### Metrics Tracked
- Most common question types
- Document type usage patterns
- User engagement metrics
- Response quality feedback

## Future Enhancements

### Planned Features
- **Batch Document Analysis**: Process multiple documents simultaneously
- **Advanced Comparisons**: More sophisticated document comparison logic
- **Template Recognition**: Identify document templates and forms
- **Automated Insights**: Proactive document analysis and alerts

### Integration Opportunities
- **Email Integration**: Process documents from email attachments
- **Calendar Integration**: Create events from extracted dates
- **Workflow Automation**: Trigger actions based on document analysis
- **Reporting**: Generate compliance reports from document queries

## Troubleshooting

### Common Issues
1. **No Response**: Check OpenAI API key and quota
2. **Wrong Document**: Verify document type filtering
3. **Permission Errors**: Check user's building access
4. **Slow Responses**: Check document size and complexity

### Debug Mode
Enable debug logging:
```bash
NODE_ENV=development
```

### Support
For issues with the document-aware response system:
1. Check browser console for client-side errors
2. Review server logs for API errors
3. Verify database table structure
4. Check OpenAI API status and quota

## Example Workflows

### Fire Risk Assessment Review
1. Upload new FRA document
2. Ask "Summarize this document"
3. Ask "What are the key actions?"
4. Ask "Compare with previous version"
5. Extract deadlines and responsibilities

### Lease Document Analysis
1. Upload lease agreement
2. Ask "What are the key terms?"
3. Ask "What are the service charge provisions?"
4. Ask "Who is responsible for repairs?"
5. Extract important dates and obligations

### Compliance Document Tracking
1. Upload compliance certificate
2. Ask "What is the compliance status?"
3. Ask "When is the next review due?"
4. Ask "What actions are required?"
5. Track compliance requirements and deadlines 