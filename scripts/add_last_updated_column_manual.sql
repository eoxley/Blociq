-- Manual SQL script to add last_updated column to building_compliance_assets table
-- Run this in your Supabase SQL Editor

-- Step 1: Add the column
ALTER TABLE building_compliance_assets 
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Update existing records to have a timestamp
UPDATE building_compliance_assets 
SET last_updated = NOW() 
WHERE last_updated IS NULL;

-- Step 3: Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'building_compliance_assets' 
AND column_name = 'last_updated';

-- Step 4: Test a query to make sure it works
SELECT 
  id, 
  building_id, 
  asset_id, 
  status, 
  last_updated 
FROM building_compliance_assets 
LIMIT 5; 