-- Add missing assigned_manager column to building_setup table
-- This fixes the building information error page

-- Add assigned_manager column to building_setup table
ALTER TABLE building_setup ADD COLUMN IF NOT EXISTS assigned_manager VARCHAR(255);

-- Add comment to document the column
COMMENT ON COLUMN building_setup.assigned_manager IS 'The assigned manager for this building setup'; 