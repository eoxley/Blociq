-- Populate sample building structure data
-- This script adds sample data for testing the building structure functionality

-- 1. Update existing buildings with structure types and status
UPDATE buildings 
SET 
  structure_type = CASE 
    WHEN name LIKE '%House%' THEN 'RMC'
    WHEN name LIKE '%Court%' THEN 'Freehold'
    ELSE 'Tripartite'
  END,
  status = CASE 
    WHEN name LIKE '%Ashwood%' THEN 'Active'
    ELSE 'Standard'
  END
WHERE structure_type IS NULL;

-- 2. Insert sample client data for buildings
INSERT INTO clients (building_id, name, email, phone, address)
SELECT 
  id as building_id,
  CASE 
    WHEN name LIKE '%Ashwood%' THEN 'Ashwood Management Ltd'
    WHEN name LIKE '%Court%' THEN 'Court Management Services'
    ELSE 'General Property Management'
  END as name,
  CASE 
    WHEN name LIKE '%Ashwood%' THEN 'management@ashwood.com'
    WHEN name LIKE '%Court%' THEN 'info@courtmanagement.com'
    ELSE 'info@generalpm.com'
  END as email,
  CASE 
    WHEN name LIKE '%Ashwood%' THEN '+44 20 7123 4567'
    WHEN name LIKE '%Court%' THEN '+44 20 7123 4568'
    ELSE '+44 20 7123 4569'
  END as phone,
  CASE 
    WHEN name LIKE '%Ashwood%' THEN '123 Ashwood Street, London, SW1A 1AA'
    WHEN name LIKE '%Court%' THEN '456 Court Road, London, SW1A 2BB'
    ELSE '789 General Avenue, London, SW1A 3CC'
  END as address
FROM buildings
WHERE id NOT IN (SELECT building_id FROM clients);

-- 3. Insert sample RMC directors (linking existing leaseholders to buildings)
INSERT INTO rmc_directors (leaseholder_id, building_id, position, appointed_date, notes)
SELECT 
  l.id as leaseholder_id,
  l.unit_id::uuid as building_id,
  CASE 
    WHEN l.full_name LIKE '%John%' THEN 'Chairman'
    WHEN l.full_name LIKE '%Sarah%' THEN 'Secretary'
    WHEN l.full_name LIKE '%Michael%' THEN 'Treasurer'
    ELSE 'Director'
  END as position,
  CASE 
    WHEN l.full_name LIKE '%John%' THEN '2023-01-15'
    WHEN l.full_name LIKE '%Sarah%' THEN '2023-02-20'
    WHEN l.full_name LIKE '%Michael%' THEN '2023-03-10'
    ELSE '2023-04-01'
  END::date as appointed_date,
  CASE 
    WHEN l.full_name LIKE '%John%' THEN 'Experienced chairman with 5 years in property management'
    WHEN l.full_name LIKE '%Sarah%' THEN 'Organized secretary with strong administrative skills'
    WHEN l.full_name LIKE '%Michael%' THEN 'Financial background, handles all treasury matters'
    ELSE 'General director with property management experience'
  END as notes
FROM leaseholders l
JOIN units u ON l.unit_id = u.id
JOIN buildings b ON u.building_id = b.id
WHERE 
  b.structure_type = 'RMC' 
  AND l.id NOT IN (SELECT leaseholder_id FROM rmc_directors)
  AND l.full_name IN (
    'John Smith',
    'Sarah Johnson', 
    'Michael Brown',
    'Emma Wilson',
    'David Davis'
  )
LIMIT 5;

-- 4. Show summary of populated data
SELECT 'Building Structure Summary' as info;
SELECT 
  COUNT(*) as total_buildings,
  COUNT(CASE WHEN structure_type IS NOT NULL THEN 1 END) as buildings_with_structure,
  COUNT(CASE WHEN status != 'Standard' THEN 1 END) as buildings_with_custom_status
FROM buildings;

SELECT 'Client Summary' as info;
SELECT 
  COUNT(*) as total_clients,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as clients_with_email,
  COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as clients_with_phone
FROM clients;

SELECT 'RMC Directors Summary' as info;
SELECT 
  COUNT(*) as total_directors,
  COUNT(CASE WHEN position = 'Chairman' THEN 1 END) as chairmen,
  COUNT(CASE WHEN position = 'Secretary' THEN 1 END) as secretaries,
  COUNT(CASE WHEN position = 'Treasurer' THEN 1 END) as treasurers
FROM rmc_directors;

-- 5. Show sample data
SELECT 'Sample Building Data' as info;
SELECT 
  name,
  structure_type,
  status
FROM buildings 
WHERE structure_type IS NOT NULL 
LIMIT 5;

SELECT 'Sample Client Data' as info;
SELECT 
  c.name,
  c.email,
  c.phone,
  b.name as building_name
FROM clients c
JOIN buildings b ON c.building_id = b.id
LIMIT 5;

SELECT 'Sample RMC Directors Data' as info;
SELECT 
  l.full_name as director_name,
  rd.position,
  rd.appointed_date,
  b.name as building_name
FROM rmc_directors rd
JOIN leaseholders l ON rd.leaseholder_id = l.id
JOIN units u ON l.unit_id = u.id
JOIN buildings b ON u.building_id = b.id
LIMIT 5; 