-- Create the vw_units_leaseholders view that the database search expects
-- This view combines units, buildings, and leaseholders for easy querying
-- Note: Using only columns that actually exist in the database

CREATE OR REPLACE VIEW vw_units_leaseholders AS
SELECT 
    u.id as unit_id,
    u.unit_number,
    -- u.unit_label, -- Removed - column doesn't exist
    u.building_id,
    -- u.floor, -- Commented out - check if this exists
    -- u.unit_type, -- Commented out - check if this exists
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
