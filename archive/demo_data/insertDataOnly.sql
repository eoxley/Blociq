-- Insert data only - assumes major_works table already exists
-- This script only inserts mock data without creating or modifying the table

-- Clear existing data (optional - uncomment if you want to start fresh)
-- DELETE FROM major_works;

-- Insert mock data into major_works table
INSERT INTO major_works (
  id,
  building_id,
  title,
  description,
  status,
  start_date,
  estimates_issued,
  construction_start,
  completion_date,
  created_at,
  updated_at,
  consultation_stage
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440001',
  NULL,
  'Roof Refurbishment Phase 1',
  'Comprehensive roof refurbishment including replacement of damaged tiles, repair of structural elements, and installation of new insulation. This phase focuses on the main building roof structure and addresses long-term weatherproofing issues identified in the recent building survey.',
  'ongoing',
  '2025-07-01',
  '2025-06-15',
  '2025-10-01',
  '2025-12-31',
  NOW(),
  NOW(),
  'Notice of Intention'
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  NULL,
  'Elevator Modernization Project',
  'Complete modernization of the building elevator system including new control panels, safety upgrades, and accessibility improvements to meet current building regulations. This project will replace both passenger lifts with modern, energy-efficient systems.',
  'ongoing',
  '2025-06-15',
  '2025-05-20',
  '2025-09-15',
  '2025-11-30',
  NOW(),
  NOW(),
  'Estimates Review'
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  NULL,
  'External Wall Insulation',
  'Installation of external wall insulation across all residential units to improve energy efficiency and reduce heating costs for residents. This project will significantly improve the building''s EPC rating and reduce carbon emissions.',
  'completed',
  '2025-05-20',
  '2025-04-15',
  '2025-08-20',
  '2025-10-31',
  NOW(),
  NOW(),
  'Works in Progress'
),
(
  '550e8400-e29b-41d4-a716-446655440004',
  NULL,
  'Fire Safety System Upgrade',
  'Comprehensive upgrade of the building''s fire safety systems including new smoke detectors, emergency lighting, and fire alarm panels. This project addresses recommendations from the recent fire risk assessment.',
  'planned',
  '2025-08-01',
  '2025-07-15',
  '2025-11-01',
  '2026-01-31',
  NOW(),
  NOW(),
  'Notice of Intention'
),
(
  '550e8400-e29b-41d4-a716-446655440005',
  NULL,
  'Communal Area Renovation',
  'Complete renovation of all communal areas including new flooring, lighting, and decoration. This project will modernize the building''s shared spaces and improve the overall resident experience.',
  'ongoing',
  '2025-07-15',
  '2025-06-30',
  '2025-10-15',
  '2025-12-31',
  NOW(),
  NOW(),
  'Estimates Review'
);

-- Verify the data was inserted
SELECT 
  id,
  title,
  status,
  consultation_stage,
  start_date,
  estimates_issued,
  construction_start,
  completion_date,
  created_at
FROM major_works 
ORDER BY created_at DESC;

-- Show count by status
SELECT 
  status,
  COUNT(*) as count
FROM major_works 
GROUP BY status
ORDER BY status; 