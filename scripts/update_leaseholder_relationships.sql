-- Update leaseholder_id relationships in units table
-- This script matches units with leaseholders based on unit_number and building_id

-- First, let's see what we're working with
SELECT 
  u.id as unit_id,
  u.unit_number,
  u.building_id,
  u.leaseholder_id as current_leaseholder_id,
  lh.id as matching_leaseholder_id,
  lh.name as leaseholder_name,
  lh.email as leaseholder_email
FROM units u
LEFT JOIN leaseholders lh ON lh.unit_id = u.id
WHERE u.building_id = '2beeec1d-a94e-4058-b881-213d74cc6830'
ORDER BY u.unit_number;

-- Update leaseholder_id based on unit_number match
UPDATE units
SET leaseholder_id = lh.id
FROM leaseholders lh
WHERE lower(units.unit_number) = lower(lh.unit_number)
AND units.building_id = '2beeec1d-a94e-4058-b881-213d74cc6830'
AND lh.id IS NOT NULL;

-- Alternative: Update based on email match if unit_number doesn't work
-- This would be useful if leaseholders have emails but unit_number doesn't match exactly
UPDATE units
SET leaseholder_id = lh.id
FROM leaseholders lh
WHERE lh.email IS NOT NULL
AND units.building_id = '2beeec1d-a94e-4058-b881-213d74cc6830'
AND units.leaseholder_id IS NULL
AND EXISTS (
  SELECT 1 FROM units u2 
  WHERE u2.leaseholder_id = lh.id 
  AND u2.building_id = units.building_id
);

-- Show the results after update
SELECT 
  u.id as unit_id,
  u.unit_number,
  u.building_id,
  u.leaseholder_id,
  lh.name as leaseholder_name,
  lh.email as leaseholder_email,
  CASE 
    WHEN u.leaseholder_id IS NULL THEN 'Unassigned'
    ELSE 'Assigned'
  END as status
FROM units u
LEFT JOIN leaseholders lh ON lh.id = u.leaseholder_id
WHERE u.building_id = '2beeec1d-a94e-4058-b881-213d74cc6830'
ORDER BY u.unit_number;

-- Summary statistics
SELECT 
  COUNT(*) as total_units,
  COUNT(leaseholder_id) as assigned_units,
  COUNT(*) - COUNT(leaseholder_id) as unassigned_units,
  ROUND(COUNT(leaseholder_id) * 100.0 / COUNT(*), 2) as assignment_percentage
FROM units 
WHERE building_id = '2beeec1d-a94e-4058-b881-213d74cc6830'; 