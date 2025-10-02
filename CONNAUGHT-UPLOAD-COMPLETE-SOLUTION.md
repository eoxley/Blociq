# 🏢 Connaught Square - Complete Document Upload Solution

## 📊 Current Situation

**✅ Data Successfully Imported:**
- 1 Building (Connaught Square)
- 8 Units (Flat 1-8)
- 318 Documents
- 17 Compliance Assets
- 4 Compliance Inspections

**❌ Issue:** Documents stored locally at `/Users/ellie/Downloads/219.01 CONNAUGHT SQUARE/`
- BlocIQ web app can't access local files
- Need to upload to Supabase Storage

---

## 🎯 Recommended Solution: Supabase Storage

**Why Supabase Storage?**
- ✅ Integrated with your existing Supabase database
- ✅ Secure with Row Level Security (RLS)
- ✅ CDN-backed for fast global delivery
- ✅ Free tier: 1GB storage + 2GB bandwidth
- ✅ Your 318 files = ~500MB (well within limits)

---

## 🚀 Quick Start - One Command Solution

### Option 1: Run Everything Automatically

```bash
cd /Users/ellie/Desktop/blociq-frontend
./scripts/upload-connaught-docs.sh
```

This single command will:
1. ✅ Create Supabase Storage bucket
2. ✅ Upload all 318 files with progress tracking
3. ✅ Generate updated SQL with Supabase URLs
4. ✅ Verify upload completed successfully
5. ✅ Show next steps for applying storage policies

---

### Option 2: Step-by-Step Manual Process

#### Step 1: Upload Documents

```bash
cd /Users/ellie/Desktop/blociq-frontend

NEXT_PUBLIC_SUPABASE_URL=https://xqxaatvykmaaynqeoemy.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeGFhdHZ5a21hYXlucWVvZW15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE5Mzk5NCwiZXhwIjoyMDY2NzY5OTk0fQ.4Qza6DOdmF8s6jFMIkMwKgaU_DkIUspap8bOVldwMmk \
node scripts/upload-documents-to-supabase.js
```

#### Step 2: Verify Upload

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xqxaatvykmaaynqeoemy.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeGFhdHZ5a21hYXlucWVvZW15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE5Mzk5NCwiZXhwIjoyMDY2NzY5OTk0fQ.4Qza6DOdmF8s6jFMIkMwKgaU_DkIUspap8bOVldwMmk \
node scripts/verify-storage-upload.js
```

#### Step 3: Apply Storage Policies

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Go to: SQL Editor
3. Copy/paste contents of: `/Users/ellie/Desktop/BlocIQ_Output/storage_policies.sql`
4. Click "Run"

#### Step 4: Update Database (Optional)

The script generates an updated SQL file with Supabase Storage URLs:

```
/Users/ellie/Desktop/BlocIQ_Output/migration_with_storage.sql
```

If you need to re-run the migration with correct URLs, use this file.

---

## 📁 Storage Structure

Files will be organized as:

```
building-documents/                              (Supabase bucket)
└── 466b1264-275a-4bf0-85ce-26ab8b3839ea/       (building_id)
    ├── compliance/                              (60 files)
    │   ├── EICR-Report-2023.pdf
    │   ├── Fire-Risk-Assessment.pdf
    │   ├── Legionella-Assessment.pdf
    │   └── ...
    ├── financial/                               (7 files)
    │   ├── Budget-2025-2026.xlsx
    │   ├── YE-Accounts-2023.pdf
    │   └── ...
    ├── insurance/                               (16 files)
    │   ├── Buildings-Insurance.pdf
    │   ├── DO-Insurance.pdf
    │   └── ...
    ├── contracts/                               (49 files)
    │   ├── Lift-Maintenance.pdf
    │   ├── Cleaning-Contract.pdf
    │   └── ...
    ├── major_works/                             (4 files)
    │   ├── External-Decorations.pdf
    │   └── ...
    ├── units/                                   (82 files)
    │   ├── Flat-1-Lease.pdf
    │   ├── Flat-2-Lease.pdf
    │   └── ...
    └── other/                                   (100 files)
        └── ...
```

---

## 🔒 Security Configuration

The storage policies created ensure:
- ✅ Only **authenticated users** can view documents
- ✅ Only **authenticated users** can upload documents
- ✅ Only **authenticated users** can update documents
- ✅ Only **authenticated users** can delete documents

No public access - all files require user login.

---

## ✅ Expected Results

After upload completes:

### In Supabase Dashboard
1. Navigate to: **Storage** → **building-documents**
2. You'll see folder: `466b1264-275a-4bf0-85ce-26ab8b3839ea`
3. Inside are subfolders: compliance, financial, insurance, etc.
4. Total: **318 files**

### In BlocIQ Application
1. Navigate to: `/buildings/466b1264-275a-4bf0-85ce-26ab8b3839ea/documents`
2. You'll see all 318 documents organized by category
3. Click any document to preview/download
4. Documents load from Supabase CDN (fast!)

---

## 📊 Progress Tracking

The upload script shows real-time progress:

```
╔════════════════════════════════════════════════╗
║  BlocIQ Document Uploader to Supabase Storage ║
╚════════════════════════════════════════════════╝

📦 Step 1: Creating storage bucket...
✓ Created bucket "building-documents"

📤 Step 2: Uploading files to Supabase Storage...
Found 318 files to upload

Progress: 45% (143 uploaded, 0 failed)
```

---

## ⚠️ Common Issues & Solutions

### Issue: "File already exists"
**Solution:** Script uses `upsert: true` - files are automatically replaced if they exist.

### Issue: "File too large"
**Solution:**
1. Go to Supabase Dashboard → Storage → building-documents → Settings
2. Increase "File Size Limit" to 100MB

### Issue: "Permission denied"
**Solution:** Make sure you're using `SUPABASE_SERVICE_ROLE_KEY` (not the anon key)

### Issue: "Network timeout"
**Solution:**
- Script uploads 5 files at a time to avoid timeouts
- You can safely re-run the script - it will skip already uploaded files

---

## 💰 Storage Costs

**Your Usage:**
- 318 files ≈ 500 MB storage
- Estimated monthly bandwidth: ~5 GB

**Supabase Free Tier:**
- ✅ 1 GB storage (you're using 50%)
- ✅ 2 GB bandwidth/month

**You're well within the free tier!** 🎉

If you need more:
- **Pro Plan**: $25/month → 100 GB storage, 200 GB bandwidth
- **Team Plan**: $599/month → 1 TB storage, unlimited bandwidth

---

## 🎯 Next Steps After Upload

1. **Apply Storage Policies** (Required)
   - Run SQL from `/Users/ellie/Desktop/BlocIQ_Output/storage_policies.sql`

2. **Test Document Access**
   - Navigate to: `/buildings/466b1264-275a-4bf0-85ce-26ab8b3839ea/documents`
   - Click on a few documents to verify they load

3. **Check Compliance Tab**
   - Navigate to: `/buildings/466b1264-275a-4bf0-85ce-26ab8b3839ea/compliance`
   - Verify compliance assets link to their documents

4. **(Optional) Fix Missing Data**
   - Building address: "32-34 Connaught Square, W2 2HL"
   - Leaseholder information (8 missing)
   - Apportionment percentages

---

## 📁 Files Created

After running the upload script, you'll have:

1. **`/Users/ellie/Desktop/BlocIQ_Output/migration_with_storage.sql`**
   - Updated SQL with Supabase Storage URLs
   - Use this instead of the original migration.sql

2. **`/Users/ellie/Desktop/BlocIQ_Output/storage_policies.sql`**
   - Security policies for storage bucket
   - Run this in Supabase SQL Editor

3. **Upload logs** (console output)
   - Shows which files were uploaded
   - Lists any failures with error messages

---

## 🆘 Support & Troubleshooting

If something goes wrong:

1. **Check Supabase Dashboard**
   - Storage → building-documents
   - Verify files are appearing

2. **Check Script Output**
   - Look for error messages
   - Note which files failed (if any)

3. **Re-run Upload Script**
   - Safe to run multiple times
   - Will skip files that already exist

4. **Verify Storage Policies**
   - Ensure SQL was executed successfully
   - Check: Database → Policies → storage.objects

---

## 🎉 Success Checklist

- [ ] Ran upload script successfully
- [ ] Verified 318 files in Supabase Storage
- [ ] Applied storage policies in SQL Editor
- [ ] Tested document viewing in BlocIQ UI
- [ ] All documents load without errors
- [ ] Compliance documents link correctly

---

## 📞 Questions?

Review the detailed guide:
```
/Users/ellie/Desktop/blociq-frontend/scripts/README-STORAGE-UPLOAD.md
```

Or check the script source:
```
/Users/ellie/Desktop/blociq-frontend/scripts/upload-documents-to-supabase.js
```

---

**Ready to upload? Run this:**

```bash
cd /Users/ellie/Desktop/blociq-frontend
./scripts/upload-connaught-docs.sh
```

🚀 **Let's get those documents online!**
