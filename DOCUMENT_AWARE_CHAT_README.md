# 📄 Document-Aware Chat System

## 🎯 Overview

The Document-Aware Chat System solves the core issue where users could upload documents through OCR successfully, but the main ask AI couldn't provide summary responses via chat. This system creates a seamless connection between document processing and chat functionality.

## ✨ Key Features

### 1. **Automatic Document Summary Generation**
- **Lease Documents**: Generates responses in the exact format requested:
  ```
  Flat 5, 260 Holloway Road — key points
  Term: 125 years from 29 Sep 2015 (to 28 Sep 2140).
  Ground rent: £450 p.a., RPI-linked every 10 years from 29 Sep 2025.
  Use: Single private dwelling only.
  Service charge share: 7.46% for residential-only items...
  ```

### 2. **Document Context Awareness**
- Automatically searches uploaded documents for relevant content
- Links OCR-processed text to chat conversations
- Provides context-aware AI responses

### 3. **Seamless Integration**
- Works with existing OCR processing pipeline
- Integrates with main ask AI endpoint
- Maintains conversation history and context

## 🏗️ System Architecture

### **New API Endpoints**

#### `/api/ask-ai-document-aware` (POST)
- **Purpose**: Main endpoint for document-aware chat
- **Features**: 
  - Automatic document search and context building
  - Lease-specific response formatting
  - Document analysis integration
  - AI logging and conversation tracking

#### `/api/ask-ai-enhanced` (Updated)
- **Purpose**: Enhanced file upload with OCR integration
- **Updates**: 
  - Stores full text content in `building_documents.full_text`
  - Links documents to chat conversations
  - Returns processed document information

### **Database Schema Updates**

The system uses existing tables with enhanced functionality:

```sql
-- building_documents table (existing, enhanced)
CREATE TABLE building_documents (
  id UUID PRIMARY KEY,
  building_id UUID,
  file_name TEXT,
  file_url TEXT,
  type TEXT,
  full_text TEXT,           -- NEW: Stores OCR-extracted text
  content_summary TEXT,      -- NEW: Basic content summary
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- document_chunks table (existing)
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES building_documents(id),
  chunk_index INTEGER,
  content TEXT,
  metadata JSONB
);
```

## 🚀 Implementation Details

### **1. Document Processing Flow**

```
File Upload → OCR Processing → Text Storage → Document Analysis → Chat Context
     ↓              ↓              ↓              ↓              ↓
  User selects   OCR service   Store in      AI analyzes    Chat can access
  document       extracts      building_      document       document content
                 text          documents      content        for responses
```

### **2. Chat Response Generation**

#### **Lease Documents**
- Detects lease-related keywords
- Uses specialized prompt for exact formatting
- Extracts key terms, dates, and percentages

#### **Other Documents**
- General document analysis
- Context-aware responses
- Reference to specific documents

### **3. Document Context Building**

```typescript
function buildDocumentContext(documents: any[], question: string): string {
  let context = '\n\n**RELEVANT DOCUMENTS:**\n';
  
  documents.forEach((doc, index) => {
    context += `\n${index + 1}. **${doc.file_name}** (${doc.type})\n`;
    context += `   Summary: ${doc.content_summary?.substring(0, 300)}...\n`;
    context += `   Content: ${doc.full_text?.substring(0, 1000)}...\n`;
  });
  
  return context;
}
```

## 🧪 Testing the System

### **Test Page: `/test-document-chat`**

1. **Upload Documents**: Drag & drop or click to upload files
2. **OCR Processing**: Watch real-time progress
3. **Chat Interface**: Ask questions about uploaded documents
4. **Example Questions**:
   - "What are the key terms in my lease?"
   - "Summarize the compliance requirements"
   - "What actions are needed from this document?"

### **Example Workflow**

1. **Upload a lease document** (PDF, image, etc.)
2. **Wait for OCR processing** (automatic)
3. **Ask in chat**: "What are the key terms in my lease?"
4. **Receive formatted response** with exact lease details

## 🔧 Configuration

### **Environment Variables**

```bash
# OCR Service
OCR_SERVICE_URL=https://ocr-server-2-ykmk.onrender.com/upload

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **File Type Support**

- **PDF**: Primary format with text extraction
- **Images**: JPG, PNG with OCR processing
- **Documents**: DOC, DOCX with text extraction
- **Text**: TXT files (direct processing)
- **Size Limit**: 10MB per file

## 📱 Components

### **DocumentAwareChatInput**
- Standalone chat component for document questions
- Automatic document context detection
- Conversation history management

### **Updated useAIConversation Hook**
- Integrates with document-aware endpoints
- Handles file uploads and OCR processing
- Maintains conversation state

## 🔍 How It Solves the Original Problem

### **Before (Problem)**
1. ✅ Documents uploaded successfully
2. ✅ OCR processing worked
3. ❌ Chat couldn't access document content
4. ❌ No automatic summaries generated

### **After (Solution)**
1. ✅ Documents uploaded successfully
2. ✅ OCR processing worked
3. ✅ Full text stored in database
4. ✅ Chat automatically searches documents
5. ✅ Automatic summaries with exact formatting
6. ✅ Context-aware responses

## 🚀 Usage Examples

### **Lease Document Analysis**

**User Question**: "What are the key terms in my lease?"

**AI Response**:
```
Got the lease—nice, clean copy. Here's the crisp "at-a-glance" you can drop into BlocIQ or an email 👇

Flat 5, 260 Holloway Road — key points
* **Term:** 125 years from **29 Sep 2015** (to 28 Sep 2140).
* **Ground rent:** £450 p.a., RPI-linked every 10 years from 29 Sep 2025.
* **Use:** Single private dwelling only.
* **Service charge share:** 7.46% for residential-only items / common parts for flats, 5.19% for "all other" shared costs, 0% for lift-only costs.
* **Insurance:** Landlord insures building; tenant pays Insurance Rent (their proportion).
* **Alterations:** No structural/external; internal non-structural with consent (not unreasonably withheld).
* **Alienation:** No parting with part. Whole can be underlet on an AST (no security of tenure) if regs mirrored. Assignments restricted in last 7 years of term without consent.
* **Pets:** Only with landlord's consent (may be withdrawn).
* **Smoking:** Not in common parts; mustn't cause odour outside the flat.

Bottom line: Standard residential lease with clear service charge apportionment and reasonable restrictions on alterations and subletting.
```

### **General Document Questions**

**User Question**: "What compliance requirements are mentioned?"

**AI Response**: 
```
Based on your uploaded documents, I found the following compliance requirements:

**Document: Fire Risk Assessment Report**
- Annual review required
- Next assessment due: 15 March 2025
- Key findings: Emergency lighting needs updating
- Action required: Contact electrical contractor for quotes

**Document: EICR Certificate**
- Valid until: 30 June 2026
- Overall condition: Satisfactory
- Remedial actions: None required
- Next inspection: Due within 5 years

**Recommendations:**
1. Schedule emergency lighting upgrade before March 2025
2. Set reminder for EICR renewal in 2026
3. Update compliance tracker with these dates
```

## 🔧 Troubleshooting

### **Common Issues**

1. **OCR Processing Fails**
   - Check file format and size
   - Verify OCR service connectivity
   - Review console logs for errors

2. **No Document Context in Chat**
   - Ensure documents were processed successfully
   - Check `building_documents.full_text` field
   - Verify document chunks were created

3. **Lease Formatting Issues**
   - Check if document contains lease-related keywords
   - Verify OCR text quality
   - Review AI prompt configuration

### **Debug Information**

Enable debug logging:
```typescript
console.log('🔍 Document context built for', relevantDocuments.length, 'documents');
console.log('📄 Document context:', documentContext);
console.log('🤖 AI response:', response);
```

## 🚀 Future Enhancements

### **Planned Features**
1. **Semantic Search**: Vector embeddings for better document matching
2. **Multi-Document Comparison**: Compare multiple documents side-by-side
3. **Template Generation**: Auto-generate letters and notices from documents
4. **Compliance Tracking**: Automatic deadline extraction and reminders
5. **Document Versioning**: Track document updates and changes

### **Integration Opportunities**
1. **Email System**: Link documents to email conversations
2. **Task Management**: Auto-create tasks from document requirements
3. **Reporting**: Generate compliance reports from document analysis
4. **Mobile App**: Document chat on mobile devices

## 📚 API Reference

### **Document-Aware Chat Endpoint**

```typescript
POST /api/ask-ai-document-aware

Request:
{
  question: string,
  buildingId?: string,
  documentIds?: string[],
  conversationId?: string
}

Response:
{
  success: boolean,
  response: string,
  documents_analyzed: Array<{
    id: string,
    name: string,
    type: string,
    building_id: string
  }>,
  ai_log_id: string,
  metadata: {
    queryType: string,
    documentsFound: number,
    hasDocumentContext: boolean,
    processingTime: number
  }
}
```

### **Enhanced File Upload Endpoint**

```typescript
POST /api/ask-ai-enhanced

Request: FormData
- userQuestion: string
- useMemory: string
- conversationId?: string
- buildingId?: string
- file_0: File
- file_1: File
- ...

Response:
{
  response: string,
  sources: Array<Source>,
  confidence: number,
  knowledgeUsed: boolean,
  documentAnalyses: Array<DocumentAnalysis>,
  processedDocuments: Array<ProcessedDocument>,
  timestamp: string
}
```

## 🎉 Conclusion

The Document-Aware Chat System successfully bridges the gap between document processing and chat functionality. Users can now:

1. **Upload documents** and have them processed through OCR
2. **Ask questions** about their documents in natural language
3. **Receive automatic summaries** with exact formatting (especially for leases)
4. **Get context-aware responses** that reference specific documents
5. **Maintain conversations** with full document context

This system transforms BlocIQ from a simple document storage platform into an intelligent, document-aware AI assistant that can provide meaningful insights and summaries from uploaded content.
