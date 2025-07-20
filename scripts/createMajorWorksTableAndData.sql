-- Create major_works table if it doesn't exist
CREATE TABLE IF NOT EXISTS major_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  consultation_stage TEXT,
  section20_notice_issued DATE,
  estimated_start_date DATE,
  status TEXT DEFAULT 'Planned',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE major_works ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (for development)
CREATE POLICY "Allow all operations on major_works" ON major_works
  FOR ALL USING (true);

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
  'Comprehensive roof refurbishment including replacement of damaged tiles, repair of structural elements, and installation of new insulation. This phase focuses on the main building roof structure.',
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
  'Complete modernization of the building elevator system including new control panels, safety upgrades, and accessibility improvements to meet current building regulations.',
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
  'Installation of external wall insulation across all residential units to improve energy efficiency and reduce heating costs for residents.',
  'Works in Progress',
  '2025-05-20',
  '2025-08-20',
  'Completed',
  NOW(),
  NOW()
); 