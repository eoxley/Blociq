-- Create major_works table if it doesn't exist
CREATE TABLE IF NOT EXISTS major_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  consultation_stage TEXT CHECK (consultation_stage IN ('Notice of Intention', 'Estimates Review', 'Works in Progress')),
  section20_notice_issued DATE,
  estimated_start_date DATE,
  status TEXT DEFAULT 'Planned' CHECK (status IN ('Planned', 'Ongoing', 'Completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE major_works ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (for development)
CREATE POLICY "Allow all operations on major_works" ON major_works
  FOR ALL USING (true);

-- Clear existing data (optional - comment out if you want to keep existing data)
-- DELETE FROM major_works;

-- Insert mock data into major_works table
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
  '550e8400-e29b-41d4-a716-446655440001',
  'Roof Refurbishment Phase 1',
  'Comprehensive roof refurbishment including replacement of damaged tiles, repair of structural elements, and installation of new insulation. This phase focuses on the main building roof structure and addresses long-term weatherproofing issues identified in the recent building survey.',
  'Notice of Intention',
  '2025-07-01',
  '2025-10-01',
  'Planned',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'Elevator Modernization Project',
  'Complete modernization of the building elevator system including new control panels, safety upgrades, and accessibility improvements to meet current building regulations. This project will replace both passenger lifts with modern, energy-efficient systems.',
  'Estimates Review',
  '2025-06-15',
  '2025-09-15',
  'Ongoing',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  'External Wall Insulation',
  'Installation of external wall insulation across all residential units to improve energy efficiency and reduce heating costs for residents. This project will significantly improve the building''s EPC rating and reduce carbon emissions.',
  'Works in Progress',
  '2025-05-20',
  '2025-08-20',
  'Completed',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440004',
  'Fire Safety System Upgrade',
  'Comprehensive upgrade of the building''s fire safety systems including new smoke detectors, emergency lighting, and fire alarm panels. This project addresses recommendations from the recent fire risk assessment.',
  'Notice of Intention',
  '2025-08-01',
  '2025-11-01',
  'Planned',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440005',
  'Communal Area Renovation',
  'Complete renovation of all communal areas including new flooring, lighting, and decoration. This project will modernize the building''s shared spaces and improve the overall resident experience.',
  'Estimates Review',
  '2025-07-15',
  '2025-10-15',
  'Ongoing',
  NOW(),
  NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_major_works_status ON major_works(status);
CREATE INDEX IF NOT EXISTS idx_major_works_consultation_stage ON major_works(consultation_stage);
CREATE INDEX IF NOT EXISTS idx_major_works_created_at ON major_works(created_at DESC);

-- Verify the data was inserted correctly
SELECT 
  id,
  title,
  consultation_stage,
  status,
  section20_notice_issued,
  estimated_start_date,
  created_at
FROM major_works 
ORDER BY created_at DESC; 