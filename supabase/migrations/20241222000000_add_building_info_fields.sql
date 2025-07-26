-- Add missing building information fields for the frontend
-- These fields are referenced in the EditableBuildingInfo component

-- Add notes field (general notes)
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add key access notes field (separate from general access_notes)
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS key_access_notes TEXT;

-- Add entry code field
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS entry_code VARCHAR(100);

-- Add fire panel location field
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS fire_panel_location VARCHAR(255);

-- Add updated_at column if it doesn't exist
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS update_buildings_updated_at ON buildings;

-- Create trigger
CREATE TRIGGER update_buildings_updated_at
    BEFORE UPDATE ON buildings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 