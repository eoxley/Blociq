# BlocIQ AI-Powered Template System

## Overview

The AI-powered template system enhances BlocIQ's communications module with intelligent document generation, semantic search, and AI-assisted template management. This system allows users to upload .docx templates, generate documents with dynamic data, and leverage AI for template rewriting, searching, and creation.

## Features

### ✅ Core Features
- **Template Management**: Upload, store, and manage .docx templates in Supabase
- **Dynamic Document Generation**: Replace placeholders with real data from buildings and leaseholders
- **AI-Powered Rewriting**: Use AI to modify existing templates for specific needs
- **Semantic Search**: Find relevant templates using natural language queries
- **Template Creation**: Generate new templates from scratch using AI
- **Document History**: Track all generated documents with metadata

### 🤖 AI Capabilities
- **Template Rewriting**: Modify existing templates while maintaining structure
- **Smart Search**: Find templates using semantic understanding
- **Content Generation**: Create new templates based on requirements
- **Context Awareness**: Use building and leaseholder data for personalized content

## Database Schema

### Tables

#### `templates`
```sql
CREATE TABLE templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('welcome_letter', 'notice', 'form', 'invoice', 'legal_notice', 'section_20')),
    description TEXT,
    storage_path VARCHAR(500) NOT NULL,
    content_text TEXT, -- Extracted text for AI processing
    placeholders TEXT[], -- Available placeholders
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `template_embeddings`
```sql
CREATE TABLE template_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    embedding VECTOR(1536), -- OpenAI embedding vector
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `generated_documents`
```sql
CREATE TABLE generated_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    filled_by VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    placeholder_data JSONB, -- Data used to fill placeholders
    ai_generated BOOLEAN DEFAULT FALSE, -- Track if AI was used
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### 1. `/api/generate-doc`
**Purpose**: Generate documents from templates with placeholder replacement

**Method**: `POST`

**Request Body**:
```json
{
  "templateId": "uuid",
  "buildingId": "uuid",
  "placeholderData": {
    "leaseholder_name": "John Doe",
    "building_name": "Ashwood House",
    "unit_number": "Flat 3B",
    "service_charge_amount": "£1,200.00"
  },
  "aiGenerated": false
}
```

**Response**:
```json
{
  "success": true,
  "fileUrl": "https://...",
  "filename": "template_name_2024-01-01.docx",
  "templateName": "Service Charge Notice",
  "aiGenerated": false
}
```

### 2. `/api/ask-ai`
**Purpose**: AI-powered template assistance (rewrite, search, create)

**Method**: `POST`

**Request Body**:
```json
{
  "prompt": "Make this more formal and add legal disclaimers",
  "buildingId": "uuid",
  "templateId": "uuid",
  "action": "rewrite" // "rewrite", "search", "create_new"
}
```

**Response**:
```json
{
  "success": true,
  "response": "Rewritten template content...",
  "context": { /* building and template data */ },
  "action": "rewrite"
}
```

### 3. `/api/generate-embeddings`
**Purpose**: Generate OpenAI embeddings for semantic search

**Method**: `POST`

**Request Body**:
```json
{
  "templateId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "templateId": "uuid",
  "templateName": "Service Charge Notice",
  "embeddingLength": 1536
}
```

### 4. `/api/search-templates`
**Purpose**: Semantic search for templates

**Method**: `POST`

**Request Body**:
```json
{
  "query": "service charge increase notice",
  "limit": 5
}
```

**Response**:
```json
{
  "success": true,
  "templates": [/* matching templates */],
  "searchMethod": "semantic",
  "query": "service charge increase notice"
}
```

## Frontend Routes

### 1. `/communications/templates`
- **Purpose**: List all available templates
- **Features**:
  - Search by name, description, or content
  - Filter by template type
  - Preview template content
  - Show available placeholders
  - AI assistant integration

### 2. `/communications/templates/[id]`
- **Purpose**: Generate documents from specific templates
- **Features**:
  - Dynamic form based on template placeholders
  - Building selection with auto-fill
  - AI assistant panel for rewriting
  - Document generation and download
  - Template content preview

### 3. `/communications/log`
- **Purpose**: View generated document history
- **Features**:
  - Filter by building or template type
  - Download generated documents
  - Track AI-generated vs manual documents

## AI Integration

### OpenAI Models Used
- **GPT-4**: For template rewriting and content generation
- **text-embedding-3-small**: For semantic search embeddings

### AI Context Injection
The system provides rich context to AI models:

```typescript
const contextData = {
  building_name: "Ashwood House",
  building_address: "123 Main Street",
  total_units: 24,
  leaseholders: [
    {
      unit_number: "Flat 3B",
      leaseholders: [
        { name: "John Doe", email: "john@example.com" }
      ]
    }
  ],
  template_name: "Service Charge Notice",
  template_type: "notice",
  template_content: "Original template content...",
  available_placeholders: ["leaseholder_name", "building_name", ...]
};
```

### AI Prompt Examples

#### Template Rewriting
```
System: You are a professional block manager drafting legally compliant letters and notices for UK leasehold properties.

User: Please rewrite the following template content to address this specific request: "Make this more formal and add legal disclaimers"

Template Content:
Dear {{leaseholder_name}}, This notice is to inform you...

Available Placeholders: leaseholder_name, building_name, unit_number...

Building Context:
{ building data }

Please provide a rewritten version that:
1. Maintains the same structure and placeholders
2. Addresses the specific request
3. Remains legally compliant
4. Is professional and clear
```

#### Template Search
```
System: You are an AI assistant helping to find the most relevant communication templates for UK leasehold block management.

User: Based on this request: "Find templates for service charge increases"

Available Templates:
[template data]

Building Context:
{building data}

Please recommend the best template(s) for this request and explain why they are suitable.
```

## Template Types

### Supported Types
1. **welcome_letter**: New leaseholder welcome communications
2. **notice**: General notices and announcements
3. **form**: Standardized forms and surveys
4. **invoice**: Service charge and rent invoices
5. **legal_notice**: Legal communications and notices
6. **section_20**: Major works consultation notices

### Common Placeholders
- `leaseholder_name`: Name of the leaseholder
- `building_name`: Name of the building
- `unit_number`: Unit/flat number
- `property_manager_name`: Property manager contact
- `contact_email`: Contact email address
- `contact_phone`: Contact phone number
- `today_date`: Current date
- `service_charge_amount`: Service charge amount
- `due_date`: Payment due date
- `notice_period`: Notice period duration

## Usage Examples

### 1. Generate a Service Charge Notice
```typescript
// 1. Select template
const templateId = "service-charge-notice-template";

// 2. Fill placeholder data
const placeholderData = {
  leaseholder_name: "John Doe",
  building_name: "Ashwood House",
  unit_number: "Flat 3B",
  service_charge_amount: "£1,200.00",
  effective_date: "1st April 2024",
  reason_for_change: "increased maintenance costs",
  property_manager_name: "Sarah Smith",
  contact_email: "sarah@blociq.co.uk"
};

// 3. Generate document
const response = await fetch('/api/generate-doc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ templateId, placeholderData })
});
```

### 2. Use AI to Rewrite a Template
```typescript
// 1. Ask AI to rewrite
const aiResponse = await fetch('/api/ask-ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "Make this more formal and add legal disclaimers",
    templateId: "welcome-letter-template",
    action: "rewrite"
  })
});

// 2. Use the rewritten content
const { response: rewrittenContent } = await aiResponse.json();
```

### 3. Semantic Search for Templates
```typescript
// Search for relevant templates
const searchResponse = await fetch('/api/search-templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "emergency maintenance notice",
    limit: 5
  })
});
```

## Security & Permissions

### Row Level Security (RLS)
All tables have RLS enabled with policies:
- Templates: Viewable by authenticated users
- Generated documents: Viewable by authenticated users
- Template embeddings: Viewable by authenticated users

### File Storage
- **Templates**: Stored in `templates/` bucket
- **Generated Documents**: Stored in `generated/` bucket
- **Access Control**: Public read access for generated documents

## Performance Considerations

### Embeddings
- Generate embeddings asynchronously when templates are uploaded
- Use vector similarity search for fast semantic matching
- Cache embeddings to avoid regeneration

### Document Generation
- Process documents in memory using PizZip and Docxtemplater
- Generate unique filenames to avoid conflicts
- Clean up temporary files after processing

### AI Requests
- Rate limit AI requests to manage costs
- Cache common AI responses where appropriate
- Use streaming for long AI responses

## Error Handling

### Common Errors
1. **Template not found**: 404 error with helpful message
2. **Invalid placeholder data**: 400 error with validation details
3. **AI service unavailable**: Graceful fallback to manual processing
4. **Storage errors**: Retry logic with exponential backoff

### Fallback Strategies
- Text search when semantic search fails
- Manual template selection when AI recommendations fail
- Local placeholder replacement when AI rewriting fails

## Future Enhancements

### Planned Features
1. **Template Versioning**: Track template changes over time
2. **Bulk Generation**: Generate documents for multiple leaseholders
3. **Template Analytics**: Track usage and effectiveness
4. **Advanced AI**: Multi-modal AI for image-based templates
5. **Integration**: Connect with email and communication systems

### Technical Improvements
1. **Real-time Collaboration**: Multiple users editing templates
2. **Advanced Search**: Filter by date, usage, and effectiveness
3. **Template Marketplace**: Share and discover community templates
4. **Mobile Support**: Generate documents on mobile devices

## Troubleshooting

### Common Issues

#### Template Upload Fails
- Check file format (must be .docx)
- Verify file size (max 10MB)
- Ensure storage bucket exists

#### AI Responses are Slow
- Check OpenAI API rate limits
- Verify API key is valid
- Consider upgrading to GPT-4 Turbo

#### Embeddings Not Working
- Ensure pgvector extension is installed
- Check vector dimensions match (1536)
- Verify embedding generation completed

#### Document Generation Fails
- Check placeholder syntax ({{placeholder_name}})
- Verify all required placeholders are provided
- Ensure template file is not corrupted

### Debug Mode
Enable debug mode by setting `NODE_ENV=development` to get detailed error messages and logs.

## Support

For technical support or questions about the AI template system:
1. Check the logs for detailed error messages
2. Verify all environment variables are set
3. Test with a simple template first
4. Contact the development team with specific error details 