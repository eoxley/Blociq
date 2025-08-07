-- Fix Building Schema - Add Missing Columns
-- This script adds the missing columns that are causing the schema cache error

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add missing columns to buildings table
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS key_access_notes TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS entry_code VARCHAR(50);
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

-- Create trigger for buildings table
DROP TRIGGER IF EXISTS update_buildings_updated_at ON buildings;
CREATE TRIGGER update_buildings_updated_at 
    BEFORE UPDATE ON buildings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'buildings' 
AND column_name IN ('notes', 'key_access_notes', 'entry_code', 'fire_panel_location', 'updated_at')
ORDER BY column_name; 