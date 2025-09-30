# 🚀 BlocIQ OCR MVP Kit - Setup Guide

## 📋 **Prerequisites**

- Next.js App Router (Node 18+)
- Supabase project
- Python 3.10+
- Tesseract OCR
- Poppler (for PDF → image rasterisation)

## 🔧 **System Dependencies Installation**

### **macOS:**
```bash
brew install tesseract poppler
```

### **Ubuntu:**
```bash
sudo apt-get update && sudo apt-get install -y tesseract-ocr libtesseract-dev poppler-utils
```

### **Windows:**
- Install Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki
- Install Poppler from: https://github.com/oschwartz10612/poppler-windows/releases

## 🌍 **Environment Setup**

### **1. Copy Environment Files:**
```bash
# Main app
cp env.example .env.local

# Worker
cp worker/env.example worker/.env
```

### **2. Fill in Environment Variables:**
```bash
# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
OCR_BUCKET=building_documents

# worker/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
OCR_BUCKET=building_documents
```

## 🗄️ **Database Schema Setup**

### **Option 1: Supabase CLI**
```bash
supabase db push
```

### **Option 2: SQL Editor**
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Paste and run the migration from `supabase/migrations/20250121_ocr_mvp.sql`

### **Option 3: Manual SQL**
```sql
-- Run this in Supabase SQL Editor
create table documents (
  id uuid primary key default gen_random_uuid(),
  building_id uuid null,
  title text,
  file_path text not null,
  processing_status text not null default 'queued',
  confidence_avg numeric null,
  pages_total int null,
  pages_processed int null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table document_pages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  page_number int not null,
  text text null,
  confidence numeric null,
  ocr_engine text null,
  image_path text null,
  status text not null default 'pending'
);

create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  page_from int,
  page_to int,
  text text not null,
  confidence numeric,
  source text not null,
  created_at timestamptz default now()
);

create table document_processing_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  level text,
  message text,
  meta jsonb,
  created_at timestamptz default now()
);
```

## 🐍 **Python Worker Setup**

### **1. Install Python Dependencies:**
```bash
cd worker
pip install -r requirements.txt
```

### **2. Verify Tesseract Installation:**
```bash
tesseract --version
```

### **3. Verify Poppler Installation:**
```bash
pdfinfo --version
```

## 🚀 **Running the System**

### **1. Start Next.js API:**
```bash
npm run dev:api
# or
npm run dev
```

### **2. Start Python Worker (in another terminal):**
```bash
npm run dev:worker
# or
cd worker && python worker.py
```

## 🧪 **Testing the OCR System**

### **1. Upload a PDF Document:**
1. Open your app
2. Navigate to the OCR uploader component
3. Select a PDF file (preferably a scanned lease document)
4. Click "Upload & OCR"

### **2. Monitor Processing:**
- Check the status updates in the UI
- Watch the worker logs for processing steps
- Monitor Supabase tables for data

### **3. Verify Results:**
Check these Supabase tables:
- **`documents`**: Should show `processing_status` as 'complete' and `confidence_avg`
- **`document_pages`**: Should contain per-page text, confidence, and status
- **`document_chunks`**: Should contain chunked text from the document

## 📊 **Expected Data Flow**

1. **Upload** → PDF saved to Supabase Storage, document record created with status 'queued'
2. **Worker picks up** → Status changes to 'extracting'
3. **Text extraction** → Worker tries PDF text layer first
4. **OCR fallback** → If text layer is weak, worker OCRs each page
5. **Results stored** → Pages, chunks, and final status saved to database
6. **UI updates** → Status chip shows progress via polling `/api/documents/:id/status`

## 🔍 **Troubleshooting**

### **Common Issues:**

#### **1. Tesseract/Poppler Missing:**
```bash
# macOS
brew install tesseract poppler

# Ubuntu
sudo apt-get install tesseract-ocr poppler-utils
```

#### **2. Python Dependencies:**
```bash
cd worker
pip install -r requirements.txt
```

#### **3. Supabase Storage Bucket:**
Ensure `building_documents` bucket exists in your Supabase project.

#### **4. Environment Variables:**
Verify all environment variables are set correctly in both `.env.local` and `worker/.env`.

#### **5. Worker Connection Issues:**
Check that `SUPABASE_SERVICE_ROLE_KEY` has proper permissions.

### **Debug Commands:**
```bash
# Check worker logs
cd worker && python worker.py

# Test Supabase connection
curl -X GET "https://your-project.supabase.co/rest/v1/documents" \
  -H "apikey: your_service_role_key" \
  -H "Authorization: Bearer your_service_role_key"
```

## 📈 **Performance Notes**

- **Text Layer**: Fastest (if available) - processes in seconds
- **OCR Processing**: Slower - depends on PDF size and page count
- **DPI Settings**: 300 DPI for high quality, 200 DPI for faster processing
- **Memory Usage**: Large PDFs may require more memory for image conversion

## 🔮 **Next Steps (After MVP is Working)**

1. **Enhanced OCR**: Re-process low-confidence pages with stronger preprocessing
2. **Pro OCR**: Batch low-confidence pages to Google Document AI/Azure/ABBYY
3. **Quick-capture**: Form for key fields + human-verified chunks
4. **Ask BlocIQ Integration**: Hook chunks into AI retrieval with page citations

## ✅ **Acceptance Criteria**

- [ ] Upload PDF → get `{ document_id, status: 'queued' }`
- [ ] Worker processes document → status changes to 'extracting' → 'complete'
- [ ] `document_pages` rows created with page_number, text, confidence, status
- [ ] `documents` shows processing_status as 'complete' and confidence_avg
- [ ] `document_chunks` contains chunked text
- [ ] UI status updates via `/api/documents/:id/status`
- [ ] No 400s for missing tables
- [ ] Errors logged in `document_processing_logs`

---

**🎉 Your OCR MVP is ready to process scanned lease documents!**
