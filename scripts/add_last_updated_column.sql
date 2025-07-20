-- Migration: Add last_updated column to building_compliance_assets table
-- This fixes the error: "column building_compliance_assets_1.last_updated does not exist"

-- Add the last_updated column if it doesn't exist
ALTER TABLE building_compliance_assets 
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have a last_updated timestamp
UPDATE building_compliance_assets 
SET last_updated = NOW() 
WHERE last_updated IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE building_compliance_assets 
ALTER COLUMN last_updated SET NOT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN building_compliance_assets.last_updated IS 'Timestamp when the compliance asset status was last updated';

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'building_compliance_assets' 
AND column_name = 'last_updated'; 