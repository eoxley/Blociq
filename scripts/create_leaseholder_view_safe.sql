-- Safe version: Check what columns actually exist before creating the view
-- This script will help identify the actual database schema

-- First, let's see what columns actually exist in the units table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'units' 
ORDER BY ordinal_position;

-- Check buildings table columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'buildings' 
ORDER BY ordinal_position;

-- Check leaseholders table columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leaseholders' 
ORDER BY ordinal_position;

-- Now create a minimal view with only confirmed columns (removing postcode)
CREATE OR REPLACE VIEW vw_units_leaseholders AS
SELECT 
    u.id as unit_id,
    u.unit_number,
    u.building_id,
    b.name as building_name,
    b.address as building_address,
    -- b.postcode as building_postcode, -- Removed - column doesn't exist
    lh.id as leaseholder_id,
    lh.name as leaseholder_name,
    lh.email as leaseholder_email,
    lh.phone_number as leaseholder_phone,
    lh.is_director,
    lh.director_role,
    lh.created_at as leaseholder_created_at
FROM units u
LEFT JOIN buildings b ON u.building_id = b.id
LEFT JOIN leaseholders lh ON u.id = lh.unit_id
WHERE u.id IS NOT NULL;

-- Add a comment to describe the view
COMMENT ON VIEW vw_units_leaseholders IS 'Combined view of units, buildings, and leaseholders for easy querying';

-- Grant permissions if needed
GRANT SELECT ON vw_units_leaseholders TO authenticated;
GRANT SELECT ON vw_units_leaseholders TO anon;
