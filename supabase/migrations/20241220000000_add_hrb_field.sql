-- Add High-Risk Building (HRB) flag to buildings table
ALTER TABLE buildings 
ADD COLUMN IF NOT EXISTS is_hrb BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN buildings.is_hrb IS 'Flag indicating if this building is classified as a High-Risk Building (HRB)'; 