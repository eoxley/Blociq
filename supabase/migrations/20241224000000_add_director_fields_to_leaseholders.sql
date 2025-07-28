-- Add director fields to leaseholders table
-- Date: 2024-12-24
-- Description: Add director-related fields to leaseholders table for RMC management

-- Add director fields to leaseholders table
ALTER TABLE leaseholders ADD COLUMN IF NOT EXISTS is_director BOOLEAN DEFAULT false;
ALTER TABLE leaseholders ADD COLUMN IF NOT EXISTS director_since DATE;
ALTER TABLE leaseholders ADD COLUMN IF NOT EXISTS director_notes TEXT;
ALTER TABLE leaseholders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add comments for the new fields
COMMENT ON COLUMN leaseholders.is_director IS 'Flag indicating if this leaseholder is an RMC director';
COMMENT ON COLUMN leaseholders.director_since IS 'Date when the leaseholder became a director';
COMMENT ON COLUMN leaseholders.director_notes IS 'Notes about the director role';

-- Create index for director queries
CREATE INDEX IF NOT EXISTS idx_leaseholders_is_director ON leaseholders(is_director);
CREATE INDEX IF NOT EXISTS idx_leaseholders_director_since ON leaseholders(director_since); 