# 🧠 Unified Knowledge System for BlocIQ

## Overview
This system enhances your existing BlocIQ database to support PDF uploads and industry knowledge without creating new tables. Everything works with your current `founder_knowledge`, `document_chunks`, and `document_processing_status` tables.

## 🏗️ **What's Already Set Up**

### **Existing Tables (No Changes Needed)**
- ✅ **`founder_knowledge`** - Stores PDF content and metadata
- ✅ **`document_chunks`** - Stores text chunks with embeddings
- ✅ **`document_processing_status`** - Tracks processing status

### **New Features Added**
- 🆕 **PDF Upload** - Direct to Supabase Storage
- 🆕 **AI Embeddings** - Vector search for better responses
- 🆕 **Enhanced Ask AI** - Uses knowledge base automatically
- 🆕 **Admin Interface** - Easy PDF management

## 🚀 **Quick Setup (5 Minutes)**

### **Step 1: Run the Setup Script**
```bash
# Connect to your Supabase database and run:
psql -d your_database -f scripts/setup-unified-knowledge.sql
```

### **Step 2: Install Dependencies**
```bash
npm install langchain openai
```

### **Step 3: Set Environment Variables**
```bash
# Add to your .env.local or Supabase secrets:
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### **Step 4: Add Admin Component**
Add this to your admin dashboard:
```tsx
import IndustryKnowledgeManager from '@/components/admin/IndustryKnowledgeManager';

// In your admin page:
<IndustryKnowledgeManager />
```

## 📁 **How It Works**

### **1. PDF Upload Flow**
```
User Uploads PDF → Supabase Storage → Text Extraction → Chunking → Embeddings → founder_knowledge table
```

### **2. AI Response Enhancement**
```
User Question → Search Knowledge Base → Find Relevant Chunks → Enhance AI Prompt → Better Response
```

### **3. Data Storage**
- **PDF Files**: Stored in Supabase Storage (`documents` bucket)
- **Content**: Stored in `founder_knowledge.content`
- **Chunks**: Stored in `document_chunks.content` with embeddings
- **Metadata**: Stored in `founder_knowledge` and `document_chunks.metadata`

## 🎯 **Usage Examples**

### **Upload a PDF**
1. Go to Admin Dashboard → Industry Knowledge Library
2. Fill in:
   - **Title**: "Fire Safety Regulations 2024"
   - **Category**: "Compliance & Regulations"
   - **Subcategory**: "Fire Safety"
   - **Tags**: "fire, safety, regulations, compliance"
3. Select PDF file
4. Click "Upload and Process PDF"

### **Ask AI Questions**
The system automatically enhances responses with relevant knowledge:

**Before**: "What are fire safety requirements?"
**After**: "Based on the Fire Safety Regulations 2024 document, fire safety requirements include..."

## 🔧 **Technical Details**

### **File Storage**
- **Bucket**: `documents` (create this in Supabase Storage)
- **Path**: `industry-knowledge/{timestamp}-{filename}.pdf`
- **Public URLs**: Automatically generated for access

### **Text Processing**
- **Chunk Size**: 1000 characters with 200 character overlap
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Vector Search**: PostgreSQL with pgvector extension

### **Database Schema**
```sql
-- founder_knowledge table (enhanced)
ALTER TABLE founder_knowledge ADD COLUMN IF NOT EXISTS contexts text[] DEFAULT '{}';
ALTER TABLE founder_knowledge ADD COLUMN IF NOT EXISTS priority int DEFAULT 0;
ALTER TABLE founder_knowledge ADD COLUMN IF NOT EXISTS version int DEFAULT 1;

-- document_chunks table (enhanced)
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- document_processing_status table (enhanced)
ALTER TABLE document_processing_status ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
```

## 📊 **Monitoring & Analytics**

### **View Statistics**
```sql
-- Get knowledge base stats
SELECT * FROM get_knowledge_base_stats();

-- View all knowledge documents
SELECT title, category, subcategory, tags 
FROM founder_knowledge 
WHERE 'industry_knowledge' = ANY(contexts);

-- View processing status
SELECT status, processing_type, metadata 
FROM document_processing_status 
ORDER BY created_at DESC;
```

### **Admin Dashboard**
- Total documents count
- Total chunks count
- Category breakdown
- Upload progress tracking
- Processing status

## 🚨 **Important Notes**

### **Storage Bucket**
Make sure you have a `documents` bucket in Supabase Storage with appropriate policies:

```sql
-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true);

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow public downloads
CREATE POLICY "Allow public downloads" ON storage.objects
FOR SELECT USING (bucket_id = 'documents');
```

### **Vector Extension**
Ensure the `vector` extension is enabled:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### **API Keys**
- **OpenAI API Key**: For generating embeddings and AI responses
- **Supabase Service Role Key**: For admin operations (not user key)

## 🔄 **Maintenance**

### **Regular Tasks**
- Monitor storage usage in Supabase
- Review and update knowledge categories
- Archive outdated documents
- Monitor embedding generation costs

### **Performance Optimization**
- Indexes are automatically created
- Vector search uses efficient pgvector algorithms
- Chunks are optimized for 1000-character processing

## 🆘 **Troubleshooting**

### **Common Issues**

**PDF Upload Fails**
- Check Supabase Storage bucket exists
- Verify service role key permissions
- Check file size limits

**Embeddings Not Generated**
- Verify OpenAI API key
- Check API rate limits
- Review error logs in `document_processing_status`

**Search Not Working**
- Ensure vector extension is enabled
- Check chunk data exists
- Verify embedding generation completed

### **Debug Commands**
```sql
-- Check processing status
SELECT * FROM document_processing_status WHERE status = 'failed';

-- Verify chunks exist
SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL;

-- Check knowledge documents
SELECT title, contexts FROM founder_knowledge WHERE 'industry_knowledge' = ANY(contexts);
```

## 🎉 **Benefits**

- ✅ **No New Tables** - Uses existing infrastructure
- ✅ **Automatic Enhancement** - AI responses get better automatically
- ✅ **Easy Management** - Simple admin interface
- ✅ **Scalable** - Works with any number of PDFs
- ✅ **Cost Effective** - Only pay for storage and API calls
- ✅ **Secure** - Uses existing authentication and RLS

## 🚀 **Next Steps**

1. **Run the setup script** to enhance your existing tables
2. **Create the storage bucket** in Supabase
3. **Add the admin component** to your dashboard
4. **Upload your first PDF** and test the system
5. **Watch your AI responses improve** automatically!

The system is designed to be completely transparent to your users while significantly enhancing the quality and accuracy of AI responses. Every question asked through Ask BlocIQ will automatically benefit from your industry knowledge library.
