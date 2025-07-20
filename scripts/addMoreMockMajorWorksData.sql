-- Add more mock data to existing major_works table
-- This script assumes the table already exists with the correct structure

INSERT INTO major_works (
  id,
  title,
  description,
  consultation_stage,
  section20_notice_issued,
  estimated_start_date,
  status,
  created_at,
  updated_at
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440006',
  'Balcony Safety Improvements',
  'Replacement of balcony railings and safety barriers to meet current building regulations. This project addresses safety concerns identified in the recent structural survey.',
  'Notice of Intention',
  '2025-09-01',
  '2025-12-01',
  'Planned',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440007',
  'Heating System Replacement',
  'Complete replacement of the building''s central heating system with modern, energy-efficient boilers and improved pipework. This will reduce energy costs and improve heating reliability.',
  'Estimates Review',
  '2025-08-15',
  '2025-11-15',
  'Ongoing',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440008',
  'Security System Upgrade',
  'Installation of new CCTV cameras, access control systems, and intercom upgrades throughout the building. This project will enhance security and provide better monitoring capabilities.',
  'Works in Progress',
  '2025-06-01',
  '2025-09-01',
  'Completed',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440009',
  'Waterproofing and Damp Treatment',
  'Comprehensive waterproofing treatment for basement areas and damp-proofing measures for ground floor units. This addresses ongoing moisture issues and prevents future damage.',
  'Notice of Intention',
  '2025-10-01',
  '2026-01-01',
  'Planned',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440010',
  'Landscaping and Garden Improvements',
  'Complete redesign and renovation of the building''s communal gardens including new planting, pathways, seating areas, and improved drainage systems.',
  'Estimates Review',
  '2025-09-15',
  '2025-12-15',
  'Ongoing',
  NOW(),
  NOW()
);

-- Verify the new data was inserted
SELECT 
  COUNT(*) as total_projects,
  status,
  consultation_stage
FROM major_works 
GROUP BY status, consultation_stage
ORDER BY status, consultation_stage; 