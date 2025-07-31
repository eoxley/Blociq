# Building Issues Fix Guide

## Issues Identified

1. **Building Overview Information Not Saving**: Schema cache error `PGRST204` - "Could not find the 'notes' column of 'buildings' in the schema cache"
2. **Building Structure Error**: "Failed to fetch building structure" - API endpoint issues
3. **Quick Actions API Links**: Some links may not be properly connected

## Root Cause

The database schema is out of sync with the code. The `buildings` table is missing the following columns:
- `notes` (TEXT)
- `key_access_notes` (TEXT) 
- `entry_code` (VARCHAR(50))
- `fire_panel_location` (VARCHAR(255))
- `updated_at` (TIMESTAMP WITH TIME ZONE)

## Solutions

### 1. Fix Database Schema

**Option A: Run the SQL Script**
Execute the SQL script in your Supabase SQL editor:

```sql
-- Fix Building Schema - Add Missing Columns
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add missing columns to buildings table
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS key_access_notes TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS entry_code VARCHAR(50);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS fire_panel_location VARCHAR(255);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for buildings table
DROP TRIGGER IF EXISTS update_buildings_updated_at ON buildings;
CREATE TRIGGER update_buildings_updated_at 
    BEFORE UPDATE ON buildings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

**Option B: Apply Migration**
Run the existing migration file:
```bash
supabase db push
```

### 2. Test Database Schema

Visit `/api/test-building-schema` to verify the database schema is correct.

### 3. Verify Building Structure API

The building structure API endpoint `/api/buildings/[buildingId]/structure` should now work correctly.

### 4. Quick Actions Verification

The Quick Actions have been updated to link to:
- ✅ `/buildings/${buildingId}/compliance/setup` - Compliance Setup
- ✅ `/buildings/${buildingId}/communications` - Communications  
- ✅ `/buildings/${buildingId}/major-works` - Major Works
- ✅ `/buildings/${buildingId}/structure` - Building Structure (replaced Calendar)

## Code Changes Made

### 1. Enhanced Building Update API
- Added retry logic for schema cache errors
- Better error handling and logging
- Fresh connection attempt on PGRST204 errors

### 2. Improved Building Structure Component
- Real API data fetching instead of hardcoded data
- Proper error handling and loading states
- Better user feedback

### 3. Fixed Quick Actions
- Replaced non-existent Calendar link with Building Structure
- All links now point to valid routes

## Testing Steps

1. **Apply Database Schema**: Run the SQL script in Supabase
2. **Test Building Update**: Try editing building notes in the UI
3. **Test Building Structure**: Check if the structure loads without errors
4. **Test Quick Actions**: Verify all links work correctly

## Expected Results

After applying the fixes:
- ✅ Building notes should save successfully
- ✅ Building structure should load without errors
- ✅ All Quick Actions should link to working pages
- ✅ No more PGRST204 schema cache errors

## Troubleshooting

If issues persist:
1. Check Supabase logs for detailed error messages
2. Verify environment variables are set correctly
3. Test database connection with `/api/test-building-schema`
4. Clear browser cache and reload the page 