-- ========================================
-- UPDATE LEASEHOLDERS TABLE
-- Date: 2024-12-24
-- Description: Add new fields to leaseholders table for enhanced leaseholder management
-- ========================================

-- Add new columns to leaseholders table
ALTER TABLE leaseholders ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE leaseholders ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE leaseholders ADD COLUMN IF NOT EXISTS correspondence_address TEXT;

-- Update existing records to populate full_name from name if it exists
UPDATE leaseholders 
SET full_name = name 
WHERE full_name IS NULL AND name IS NOT NULL;

-- Create index for full_name for better query performance
CREATE INDEX IF NOT EXISTS idx_leaseholders_full_name ON leaseholders(full_name);

-- Create index for phone_number for better query performance
CREATE INDEX IF NOT EXISTS idx_leaseholders_phone_number ON leaseholders(phone_number);

-- Add comment to document the table structure
COMMENT ON TABLE leaseholders IS 'Stores leaseholder information with support for multiple leaseholders per unit';
COMMENT ON COLUMN leaseholders.full_name IS 'Full name of the leaseholder (first + last or combined)';
COMMENT ON COLUMN leaseholders.email IS 'Email address of the leaseholder';
COMMENT ON COLUMN leaseholders.phone_number IS 'Phone number of the leaseholder';
COMMENT ON COLUMN leaseholders.correspondence_address IS 'Correspondence address for the leaseholder';
COMMENT ON COLUMN leaseholders.unit_id IS 'Foreign key to units table, allowing multiple leaseholders per unit'; 