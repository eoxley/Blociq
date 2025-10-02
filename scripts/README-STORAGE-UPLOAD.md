# BlocIQ Document Storage Upload Guide

## 🎯 Overview

This guide will help you upload all Connaught Square documents (318 files) from your local machine to Supabase Storage.

---

## 📋 Prerequisites

- [x] Supabase project set up
- [x] Environment variables configured:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [x] Node.js and npm installed
- [x] Source files at: `/Users/ellie/Downloads/219.01 CONNAUGHT SQUARE`

---

## 🚀 Quick Start

### Step 1: Run the Upload Script

```bash
cd /Users/ellie/Desktop/blociq-frontend

# Install dependencies (if not already)
npm install @supabase/supabase-js

# Run the upload script
NEXT_PUBLIC_SUPABASE_URL=https://xqxaatvykmaaynqeoemy.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeGFhdHZ5a21hYXlucWVvZW15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE5Mzk5NCwiZXhwIjoyMDY2NzY5OTk0fQ.4Qza6DOdmF8s6jFMIkMwKgaU_DkIUspap8bOVldwMmk \
node scripts/upload-documents-to-supabase.js
```

### Step 2: Apply Storage Policies

1. Open Supabase Dashboard → SQL Editor
2. Run the SQL from: `/Users/ellie/Desktop/BlocIQ_Output/storage_policies.sql`

### Step 3: Execute Updated Migration

```bash
# Connect to your Supabase project
psql postgresql://postgres:[password]@[project-ref].supabase.co:5432/postgres

# Or use Supabase SQL Editor to run:
# /Users/ellie/Desktop/BlocIQ_Output/migration_with_storage.sql
```

### Step 4: Verify in UI

Navigate to:
```
/buildings/466b1264-275a-4bf0-85ce-26ab8b3839ea/documents
```

You should now see all 318 documents with working preview/download links!

---

## 📁 Storage Structure

Files will be organized as:

```
building-documents/
└── 466b1264-275a-4bf0-85ce-26ab8b3839ea/  (building_id)
    ├── compliance/
    │   ├── EICR Report.pdf
    │   ├── Fire Risk Assessment.pdf
    │   └── ...
    ├── financial/
    │   ├── Budget 2025.xlsx
    │   └── ...
    ├── insurance/
    │   ├── Building Insurance.pdf
    │   └── ...
    ├── contracts/
    │   ├── Lift Maintenance.pdf
    │   └── ...
    └── other/
        └── ...
```

---

## 🔧 What the Script Does

1. ✅ Creates `building-documents` bucket in Supabase Storage
2. ✅ Uploads all 318 files with organized folder structure
3. ✅ Shows real-time progress bar
4. ✅ Handles errors with retry logic
5. ✅ Generates updated SQL with Supabase Storage URLs
6. ✅ Creates storage access policies

---

## 📊 Expected Output

```
╔════════════════════════════════════════════════╗
║  BlocIQ Document Uploader to Supabase Storage ║
╚════════════════════════════════════════════════╝

📦 Step 1: Creating storage bucket...
✓ Created bucket "building-documents"

📤 Step 2: Uploading files to Supabase Storage...
Found 318 files to upload

Progress: 100% (318 uploaded, 0 failed)

📝 Step 3: Generating updated SQL with Supabase URLs...
✓ Updated SQL saved to: /Users/ellie/Desktop/BlocIQ_Output/migration_with_storage.sql

🔒 Step 4: Storage Policy Configuration
✓ Policies saved to: /Users/ellie/Desktop/BlocIQ_Output/storage_policies.sql

╔════════════════════════════════════════════════╗
║              Upload Summary                    ║
╚════════════════════════════════════════════════╝

Total files:    318
✓ Uploaded:     318
✗ Failed:       0
Success rate:   100%
```

---

## ⚠️ Troubleshooting

### Issue: "Bucket already exists"
**Solution**: Script will skip bucket creation and continue uploading.

### Issue: "File too large"
**Solution**: Increase bucket file size limit in Supabase dashboard:
- Settings → Storage → building-documents → Edit → File Size Limit: 100MB

### Issue: "Permission denied"
**Solution**: Ensure you're using `SUPABASE_SERVICE_ROLE_KEY` (not anon key).

### Issue: "Network timeout"
**Solution**: Script will retry failed uploads. You can re-run it safely (uses `upsert: true`).

---

## 🔐 Security Notes

- Files are stored in a **private bucket** (requires authentication)
- Storage policies enforce authenticated user access only
- Service role key has full access (keep it secret!)
- Public URLs work only for authenticated users via RLS

---

## 💰 Storage Costs

**Supabase Free Tier:**
- 1 GB storage
- 2 GB bandwidth/month

**Your Usage:**
- ~500 MB for 318 documents
- Well within free tier limits

**Paid Plans:**
- Pro: $25/month → 100 GB storage, 200 GB bandwidth
- Team: $599/month → 1 TB storage, unlimited bandwidth

---

## 🎉 Success!

Once complete, all documents will be:
- ✅ Accessible via Supabase Storage URLs
- ✅ Visible in BlocIQ UI
- ✅ Downloadable by authenticated users
- ✅ Organized by category
- ✅ Backed by Supabase's global CDN

---

## 📞 Support

If you encounter issues:
1. Check Supabase dashboard for upload status
2. Review `/Users/ellie/Desktop/BlocIQ_Output/storage_policies.sql`
3. Verify bucket permissions in Supabase dashboard
