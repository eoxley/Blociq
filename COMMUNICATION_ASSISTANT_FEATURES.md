# 🚀 BlocIQ Communication Assistant - New Features

## Overview
Extended the existing BlocIQ communications tool with advanced features for template management, AI-powered assistance, and document generation.

## ✅ New Features Implemented

### 1. 📄 PDF Export After DOCX Generation
**Location**: `/api/convert-pdf`
**Features**:
- Converts generated DOCX files to PDF format
- Uses external conversion service (CloudConvert API)
- Stores PDF in Supabase `generated/` bucket
- Updates `generated_documents` with `pdf_path`
- Graceful fallback to DOCX if PDF conversion fails

**Usage**:
```typescript
// After generating a DOCX document
const response = await fetch('/api/convert-pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ filePath: 'generated/document.docx' })
});

const { pdfUrl, pdfPath } = await response.json();
```

### 2. 📤 Drag-and-Drop Template Uploader
**Location**: `/communications/templates/upload`
**Component**: `components/TemplateUploader.tsx`
**Features**:
- Drag-and-drop interface using `react-dropzone`
- Accepts only .docx files
- Automatic placeholder detection using regex
- Real-time file analysis
- Form validation and error handling
- Automatic embedding generation for semantic search

**Template Upload Flow**:
1. User drags .docx file onto upload area
2. System extracts text content from file
3. Regex detects placeholders: `/\{\{([^}]+)\}\}/g`
4. User fills in template metadata (name, type, description)
5. File uploaded to Supabase `templates/` bucket
6. Metadata saved to `templates` table
7. Embeddings generated for semantic search

**Placeholder Detection**:
```typescript
const extractPlaceholders = (content: string): string[] => {
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const placeholders: string[] = [];
  let match;
  
  while ((match = placeholderRegex.exec(content)) !== null) {
    const placeholder = match[1].trim();
    if (!placeholders.includes(placeholder)) {
      placeholders.push(placeholder);
    }
  }
  
  return placeholders;
};
```

### 3. 🤖 GPT-Powered Template Suggestions
**Enhanced**: `/api/ask-ai`
**Features**:
- Semantic search using OpenAI embeddings
- Vector similarity matching
- Fallback to text search if embeddings unavailable
- Context-aware template recommendations
- Direct links to matching templates
- Pre-filled building/unit context

**AI Search Flow**:
1. User asks vague question: "I need a letter for missed service charge"
2. System generates embedding for the query
3. Vector search finds similar templates
4. AI analyzes and ranks results
5. Returns best matches with explanations
6. Provides direct links to templates

**Example AI Response**:
```
Based on your request "I need a letter for missed service charge", I recommend:

1. **Service Charge Notice Template** (95% match)
   - Perfect for service charge communications
   - Includes payment terms and consequences
   - Link: /communications/templates/service-charge-notice

2. **Payment Reminder Template** (87% match)
   - Good for follow-up communications
   - Professional payment reminder format
   - Link: /communications/templates/payment-reminder

Suggested placeholders to fill:
- leaseholder_name: [from building data]
- service_charge_amount: [amount owed]
- due_date: [payment deadline]
```

## 🛠 Technical Implementation

### Database Schema Updates
```sql
-- Add PDF path to generated documents
ALTER TABLE generated_documents 
ADD COLUMN pdf_path VARCHAR(500);

-- Template embeddings for semantic search
CREATE TABLE template_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Endpoints

#### `/api/convert-pdf`
```typescript
POST /api/convert-pdf
Body: { filePath: string }
Response: { pdfUrl: string, pdfPath: string }
```

#### Enhanced `/api/ask-ai`
```typescript
POST /api/ask-ai
Body: { 
  prompt: string, 
  buildingId?: string, 
  templateId?: string, 
  action: 'rewrite' | 'search' | 'create_new' 
}
Response: { 
  response: string, 
  suggestedTemplates: Template[], 
  context: object 
}
```

### Frontend Components

#### TemplateUploader.tsx
- Drag-and-drop interface
- File validation
- Placeholder extraction
- Form handling
- Upload progress

#### Enhanced Template Generation Page
- PDF export button
- AI assistant panel
- Template suggestions
- Context-aware form filling

## 🎯 User Experience Improvements

### 1. Streamlined Template Upload
- **Before**: Manual file upload + manual placeholder entry
- **After**: Drag-and-drop + automatic detection

### 2. Intelligent Template Discovery
- **Before**: Browse through all templates
- **After**: AI suggests relevant templates based on natural language

### 3. Enhanced Document Generation
- **Before**: DOCX only
- **After**: DOCX + PDF export

### 4. Context-Aware AI
- **Before**: Generic AI responses
- **After**: Building-specific, template-aware suggestions

## 🔧 Configuration

### Environment Variables
```env
# PDF Conversion (optional)
CLOUDCONVERT_API_KEY=your_api_key

# OpenAI (required for AI features)
OPENAI_API_KEY=your_openai_key

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### Dependencies
```json
{
  "react-dropzone": "^14.2.3",
  "openai": "^5.8.2",
  "@supabase/supabase-js": "^2.39.0"
}
```

## 🚀 Usage Examples

### 1. Upload a New Template
```typescript
// User drags .docx file
// System automatically detects:
// - Content: "Dear {{leaseholder_name}}, your service charge is {{amount}}"
// - Placeholders: ["leaseholder_name", "amount"]
// - Suggests: "Service Charge Notice" as template name
```

### 2. AI Template Search
```typescript
// User asks: "I need a letter for major works"
// AI responds:
// "I found a Section 20 Notice template (98% match)
//  Perfect for major works consultation
//  Link: /communications/templates/section-20-notice"
```

### 3. PDF Export
```typescript
// After generating DOCX
// User clicks "Download as PDF"
// System converts and provides PDF download link
```

## 🔮 Future Enhancements

### Planned Features
1. **Real-time Collaboration**: Multiple users editing templates
2. **Template Versioning**: Track changes over time
3. **Advanced AI**: Multi-modal AI for image-based templates
4. **Bulk Operations**: Generate documents for multiple leaseholders
5. **Template Analytics**: Track usage and effectiveness

### Technical Improvements
1. **Local PDF Conversion**: Server-side conversion without external APIs
2. **Advanced Embeddings**: Fine-tuned embeddings for leasehold domain
3. **Caching**: Cache AI responses and embeddings
4. **Offline Support**: Work without internet connection

## 📊 Performance Considerations

### Optimization Strategies
- **Lazy Loading**: Load templates on demand
- **Debounced Search**: Reduce API calls during typing
- **Caching**: Cache embeddings and AI responses
- **Compression**: Compress uploaded files
- **CDN**: Use CDN for generated documents

### Monitoring
- **Error Tracking**: Monitor conversion failures
- **Performance Metrics**: Track upload and conversion times
- **Usage Analytics**: Monitor template usage patterns
- **Cost Tracking**: Monitor AI API usage

## 🛡 Security & Compliance

### Security Measures
- **File Validation**: Validate file types and sizes
- **Access Control**: RLS policies on all tables
- **API Rate Limiting**: Prevent abuse
- **Secure Storage**: Encrypted file storage

### Compliance
- **Data Protection**: GDPR-compliant data handling
- **Audit Trail**: Track all document generations
- **Data Retention**: Configurable retention policies
- **Privacy**: Secure handling of leaseholder data

## 🎉 Success Metrics

### User Adoption
- Template upload success rate
- AI suggestion usage
- PDF export frequency
- User satisfaction scores

### Technical Performance
- Upload success rate
- Conversion success rate
- AI response time
- System uptime

### Business Impact
- Time saved per document
- Template reuse rate
- User engagement
- Support ticket reduction

This comprehensive enhancement transforms BlocIQ's communication system into a powerful, AI-driven platform that significantly improves productivity for property managers. 