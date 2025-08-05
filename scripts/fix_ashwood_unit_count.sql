-- Fix Ashwood House unit count
-- This script updates the unit_count for Ashwood House based on actual units in the database

-- First, let's see what we have
SELECT 
  b.id,
  b.name,
  b.unit_count as current_unit_count,
  COUNT(u.id) as actual_units
FROM buildings b
LEFT JOIN units u ON b.id = u.building_id
WHERE b.name = 'Ashwood House'
GROUP BY b.id, b.name, b.unit_count;

-- Update the unit_count to match actual units
UPDATE buildings 
SET unit_count = (
  SELECT COUNT(*) 
  FROM units 
  WHERE building_id = buildings.id
)
WHERE name = 'Ashwood House';

-- Verify the fix
SELECT 
  b.id,
  b.name,
  b.unit_count as updated_unit_count,
  COUNT(u.id) as actual_units
FROM buildings b
LEFT JOIN units u ON b.id = u.building_id
WHERE b.name = 'Ashwood House'
GROUP BY b.id, b.name, b.unit_count;

-- Show all units for Ashwood House
SELECT 
  u.id,
  u.unit_number,
  u.type,
  u.floor
FROM units u
JOIN buildings b ON u.building_id = b.id
WHERE b.name = 'Ashwood House'
ORDER BY u.unit_number; 