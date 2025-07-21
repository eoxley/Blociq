-- Remove duplicate Ashwood House entries
-- This script removes duplicate Ashwood House entries, keeping only the first one

-- First, let's see what we have
SELECT id, name, address, created_at 
FROM buildings 
WHERE name = 'Ashwood House' 
ORDER BY created_at;

-- Remove duplicate entries (keep the first one, remove the rest)
-- We'll delete entries with higher IDs, assuming the first one has the lowest ID
DELETE FROM buildings 
WHERE name = 'Ashwood House' 
AND id NOT IN (
  SELECT MIN(id) 
  FROM buildings 
  WHERE name = 'Ashwood House'
);

-- Verify the cleanup
SELECT id, name, address, created_at 
FROM buildings 
WHERE name = 'Ashwood House' 
ORDER BY created_at;

-- Also clean up any related data that might reference the deleted building
-- Update any references to point to the remaining building
UPDATE units 
SET building_id = (SELECT MIN(id) FROM buildings WHERE name = 'Ashwood House')
WHERE building_id IN (
  SELECT id 
  FROM buildings 
  WHERE name = 'Ashwood House' 
  AND id NOT IN (SELECT MIN(id) FROM buildings WHERE name = 'Ashwood House')
);

UPDATE leases 
SET building_id = (SELECT MIN(id) FROM buildings WHERE name = 'Ashwood House')
WHERE building_id IN (
  SELECT id 
  FROM buildings 
  WHERE name = 'Ashwood House' 
  AND id NOT IN (SELECT MIN(id) FROM buildings WHERE name = 'Ashwood House')
);

UPDATE incoming_emails 
SET building_id = (SELECT MIN(id) FROM buildings WHERE name = 'Ashwood House')
WHERE building_id IN (
  SELECT id 
  FROM buildings 
  WHERE name = 'Ashwood House' 
  AND id NOT IN (SELECT MIN(id) FROM buildings WHERE name = 'Ashwood House')
);

UPDATE building_setup 
SET building_id = (SELECT MIN(id) FROM buildings WHERE name = 'Ashwood House')
WHERE building_id IN (
  SELECT id 
  FROM buildings 
  WHERE name = 'Ashwood House' 
  AND id NOT IN (SELECT MIN(id) FROM buildings WHERE name = 'Ashwood House')
);

-- Final verification
SELECT 'Buildings after cleanup:' as info;
SELECT id, name, address, created_at 
FROM buildings 
WHERE name = 'Ashwood House' 
ORDER BY created_at;

SELECT 'Units referencing Ashwood House:' as info;
SELECT u.id, u.unit_number, b.name as building_name
FROM units u
JOIN buildings b ON u.building_id = b.id
WHERE b.name = 'Ashwood House'
ORDER BY u.unit_number; 