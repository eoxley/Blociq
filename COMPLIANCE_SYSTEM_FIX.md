# 🔧 Compliance System Fix Guide

## 🚨 Problem Identified

The compliance system is failing with the error:
```
column building_compliance_assets.idasbca_id does not exist
```

This error occurs when trying to submit compliance assets in the compliance setup modal.

## 🔍 Root Cause

The database schema is out of sync with the code. The issue is:

1. **Missing Tables**: Some compliance-related tables don't exist
2. **Column Mismatch**: The code references columns that don't exist in the database
3. **Schema Inconsistency**: Multiple migration files have created conflicting schemas

## ✅ Solution Applied

### 1. Fixed API Endpoints

- **`/api/buildings/[id]/compliance/bulk-add`**: Fixed column names and added validation
- **`/api/compliance/upload`**: Updated to use correct table structure
- **Enhanced error logging**: Better debugging information

### 2. Created Database Schema Fix

**File**: `scripts/fix_compliance_schema.sql`

This script:
- Creates all missing compliance tables
- Adds missing columns to existing tables
- Sets up proper indexes and constraints
- Inserts sample compliance assets
- Configures Row Level Security (RLS)
- Sets up automatic `updated_at` triggers

### 3. Created Test Script

**File**: `scripts/test_compliance_system.js`

This script verifies that:
- All tables exist and are accessible
- CRUD operations work correctly
- File uploads can be processed
- The system is fully functional

## 🚀 How to Fix

### Option 1: Run the SQL Script (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to your project
   - Go to SQL Editor

2. **Execute the Fix Script**
   - Copy the contents of `scripts/fix_compliance_schema.sql`
   - Paste into the SQL Editor
   - Click "Run"

3. **Verify the Fix**
   - Check that all tables were created
   - Verify sample data was inserted

### Option 2: Use Supabase CLI

```bash
# If you have the Supabase CLI installed
supabase db push
```

### Option 3: Run the Test Script

```bash
# After applying the schema fix
node scripts/test_compliance_system.js
```

## 📊 What Gets Fixed

### Tables Created/Updated

1. **`compliance_assets`** - Master list of compliance requirements
2. **`building_compliance_assets`** - Building-specific compliance tracking
3. **`compliance_documents`** - Compliance document storage
4. **`building_documents`** - General building document storage
5. **`building_compliance_documents`** - Links between assets and documents

### Sample Data Inserted

- **Fire Safety**: Fire Risk Assessment, Emergency Lighting, Fire Alarm Tests
- **Lifts**: Lift Service, Lift Insurance
- **Gas Safety**: Gas Safety Certificate
- **Electrical**: EICR, PAT Testing
- **Water Safety**: Legionella Assessment, Water Tank Cleaning
- **Health & Safety**: Asbestos Survey, Risk Assessment
- **Insurance**: Buildings Insurance Certificate
- **Energy**: EPC Certificate

## 🧪 Testing the Fix

After applying the schema fix:

1. **Go to a building's compliance page**
2. **Open the compliance setup modal**
3. **Select some compliance assets**
4. **Click "Save"**
5. **Verify no errors occur**

## 🔍 Debugging

If you still encounter issues:

1. **Check the browser console** for detailed error messages
2. **Check the API logs** in your Supabase dashboard
3. **Run the test script** to verify the database is working
4. **Check the network tab** for failed API calls

## 📝 API Endpoints Fixed

### Bulk Add Compliance Assets
- **Endpoint**: `POST /api/buildings/[id]/compliance/bulk-add`
- **Fixed**: Column names, validation, error handling

### Compliance Document Upload
- **Endpoint**: `POST /api/compliance/upload`
- **Fixed**: Table structure, file storage, document linking

### Compliance Data Fetching
- **Endpoint**: `GET /api/buildings/[id]/compliance`
- **Status**: Already working correctly

## 🎯 Expected Results

After applying the fix:

✅ **Compliance setup modal works without errors**
✅ **Assets can be added to buildings**
✅ **Documents can be uploaded**
✅ **Compliance tracking is functional**
✅ **No more "column does not exist" errors**

## 🚨 Important Notes

1. **Backup your database** before running the schema fix
2. **Test in a development environment** first if possible
3. **The fix is non-destructive** - it only adds missing tables/columns
4. **Existing data is preserved** - no data will be lost

## 🔄 Next Steps

1. **Apply the database schema fix**
2. **Test the compliance system**
3. **Verify all functionality works**
4. **Report any remaining issues**

## 📞 Support

If you encounter any issues after applying the fix:

1. Check the error logs in your Supabase dashboard
2. Run the test script to verify the fix
3. Check the browser console for detailed error messages
4. Ensure all environment variables are correctly set

---

**Status**: ✅ **FIX READY** - Apply the schema fix to resolve the compliance system issues.
