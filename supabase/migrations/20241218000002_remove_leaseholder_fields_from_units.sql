-- Migration: Remove leaseholder_email from units table and ensure proper leaseholder_id relationships
-- This ensures all leaseholder data is accessed via the leaseholders table join using leaseholder_id

-- 1. Drop the leaseholder_email column from units table
ALTER TABLE units DROP COLUMN IF EXISTS leaseholder_email;

-- 2. Ensure leaseholder_id column exists and has proper foreign key constraint
ALTER TABLE units ADD COLUMN IF NOT EXISTS leaseholder_id UUID REFERENCES leaseholders(id) ON DELETE SET NULL;

-- 3. Update the get_leaseholder_email function to use the leaseholders table
CREATE OR REPLACE FUNCTION get_leaseholder_email(building_name TEXT, unit_number TEXT)
RETURNS TEXT AS $$
DECLARE
    email_address TEXT;
BEGIN
    SELECT l.email INTO email_address
    FROM units u
    JOIN buildings b ON u.building_id = b.id
    JOIN leaseholders l ON l.id = u.leaseholder_id
    WHERE b.name = building_name 
    AND u.unit_number = unit_number
    AND u.leaseholder_id IS NOT NULL
    LIMIT 1;
    
    RETURN email_address;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a view for backward compatibility (if needed)
CREATE OR REPLACE VIEW units_with_leaseholders AS
SELECT 
    u.id,
    u.building_id,
    u.unit_number,
    u.type,
    u.floor,
    u.created_at,
    u.leaseholder_id,
    l.name as leaseholder_name,
    l.email as leaseholder_email,
    l.phone as leaseholder_phone
FROM units u
LEFT JOIN leaseholders l ON l.id = u.leaseholder_id;

-- 5. Add comments to document the change
COMMENT ON TABLE units IS 'Units table - leaseholder data is now accessed via leaseholders table join';
COMMENT ON TABLE leaseholders IS 'Leaseholders table - contains all leaseholder contact information'; 