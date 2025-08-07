-- Test script to verify building update functionality
-- Run this in your Supabase SQL editor to test the new fields

-- First, let's check if the new columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'buildings' 
AND column_name IN ('notes', 'key_access_notes', 'entry_code', 'fire_panel_location', 'updated_at')
ORDER BY column_name;

-- Check if we have any buildings to test with
SELECT id, name, address FROM buildings LIMIT 5;

-- Test updating a building with the new fields
-- Replace 'your-building-id-here' with an actual building ID from your database
UPDATE buildings 
SET 
  notes = 'Test notes updated',
  key_access_notes = 'Test key access notes',
  entry_code = '1234',
  fire_panel_location = 'Ground floor lobby',
  updated_at = NOW()
WHERE id = 'your-building-id-here';

-- Verify the update worked
SELECT id, name, notes, key_access_notes, entry_code, fire_panel_location, updated_at 
FROM buildings 
WHERE id = 'your-building-id-here'; 