-- Add High-Risk Building (HRB) flag to buildings table
ALTER TABLE buildings 
ADD COLUMN IF NOT EXISTS is_hrb BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN buildings.is_hrb IS 'Flag indicating if this building is classified as a High-Risk Building (HRB)';

-- Update existing buildings to set HRB status (example - you can modify these based on your needs)
-- UPDATE buildings SET is_hrb = true WHERE name LIKE '%Ashwood%'; -- Example: Ashwood House as HRB
-- UPDATE buildings SET is_hrb = true WHERE name LIKE '%Maple%';   -- Example: Maple Court as HRB

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'buildings' AND column_name = 'is_hrb'; 