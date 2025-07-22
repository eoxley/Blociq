-- Complete Major Works Schema for BlocIQ
-- This script creates all necessary tables for the major works feature

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create major_works_projects table (main projects table)
CREATE TABLE IF NOT EXISTS major_works_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled')),
  consultation_stage TEXT CHECK (consultation_stage IN ('Notice of Intention', 'Estimates Review', 'Works in Progress', 'Completed')),
  section20_notice_issued DATE,
  estimated_start_date DATE,
  actual_start_date DATE,
  estimated_completion_date DATE,
  actual_completion_date DATE,
  estimated_cost DECIMAL(12,2),
  actual_cost DECIMAL(12,2),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  project_type TEXT,
  contractor_name TEXT,
  contractor_email TEXT,
  contractor_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create major_works_documents table (for file attachments)
CREATE TABLE IF NOT EXISTS major_works_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES major_works_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('S20 Notice', 'Quote', 'Specification', 'Contract', 'Invoice', 'Certificate', 'Other')),
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT false
);

-- 3. Create major_works_logs table (for timeline events)
CREATE TABLE IF NOT EXISTS major_works_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES major_works_projects(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create major_works_observations table (for project observations)
CREATE TABLE IF NOT EXISTS major_works_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES major_works_projects(id) ON DELETE CASCADE,
  observation_type TEXT NOT NULL CHECK (observation_type IN ('Site Visit', 'Progress Update', 'Issue', 'Milestone', 'Quality Check', 'Other')),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  photos JSONB, -- Array of photo URLs
  weather_conditions TEXT,
  personnel_present TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE major_works_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE major_works_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE major_works_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE major_works_observations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now - can be restricted later)
CREATE POLICY "Allow all operations on major_works_projects" ON major_works_projects
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on major_works_documents" ON major_works_documents
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on major_works_logs" ON major_works_logs
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on major_works_observations" ON major_works_observations
  FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_major_works_projects_building_id ON major_works_projects(building_id);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_status ON major_works_projects(status);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_consultation_stage ON major_works_projects(consultation_stage);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_created_at ON major_works_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_is_active ON major_works_projects(is_active);

CREATE INDEX IF NOT EXISTS idx_major_works_documents_project_id ON major_works_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_major_works_documents_type ON major_works_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_major_works_documents_uploaded_at ON major_works_documents(uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_major_works_logs_project_id ON major_works_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_major_works_logs_timestamp ON major_works_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_major_works_logs_created_at ON major_works_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_major_works_observations_project_id ON major_works_observations(project_id);
CREATE INDEX IF NOT EXISTS idx_major_works_observations_type ON major_works_observations(observation_type);
CREATE INDEX IF NOT EXISTS idx_major_works_observations_created_at ON major_works_observations(created_at DESC);

-- Insert sample data for testing
INSERT INTO major_works_projects (
  id,
  building_id,
  title,
  description,
  status,
  consultation_stage,
  section20_notice_issued,
  estimated_start_date,
  estimated_completion_date,
  estimated_cost,
  completion_percentage,
  priority,
  project_type,
  contractor_name,
  contractor_email,
  contractor_phone,
  is_active,
  created_at,
  updated_at
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440001',
  '1', -- Ashwood House
  'Roof Refurbishment Phase 1',
  'Comprehensive roof refurbishment including replacement of damaged tiles, repair of structural elements, and installation of new insulation. This phase focuses on the main building roof structure and addresses long-term weatherproofing issues identified in the recent building survey.',
  'ongoing',
  'Works in Progress',
  '2025-07-01',
  '2025-10-01',
  '2025-12-31',
  75000.00,
  45,
  'high',
  'Roofing',
  'ABC Roofing Ltd',
  'info@abcroofing.co.uk',
  '020 7123 4567',
  true,
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  '1', -- Ashwood House
  'Elevator Modernization Project',
  'Complete modernization of the building elevator system including new control panels, safety upgrades, and accessibility improvements to meet current building regulations. This project will replace both passenger lifts with modern, energy-efficient systems.',
  'planned',
  'Estimates Review',
  '2025-06-15',
  '2025-09-15',
  '2025-11-15',
  120000.00,
  0,
  'medium',
  'Lifts',
  'LiftTech Solutions',
  'info@lifttech.co.uk',
  '020 7123 4568',
  true,
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  '1', -- Ashwood House
  'External Wall Insulation',
  'Installation of external wall insulation across all residential units to improve energy efficiency and reduce heating costs for residents. This project will significantly improve the building''s EPC rating and reduce carbon emissions.',
  'completed',
  'Completed',
  '2025-05-20',
  '2025-08-20',
  '2025-10-20',
  95000.00,
  100,
  'medium',
  'Insulation',
  'EcoInsulate Ltd',
  'info@ecoinsulate.co.uk',
  '020 7123 4569',
  false,
  NOW(),
  NOW()
);

-- Insert sample documents
INSERT INTO major_works_documents (
  project_id,
  title,
  description,
  document_type,
  file_url,
  file_size,
  file_type,
  uploaded_at
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440001',
  'S20 Notice - Roof Refurbishment',
  'Section 20 Notice of Intention for roof refurbishment works',
  'S20 Notice',
  'https://example.com/documents/s20-roof-notice.pdf',
  245760,
  'application/pdf',
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Roofing Quote - ABC Roofing',
  'Detailed quote for roof refurbishment works',
  'Quote',
  'https://example.com/documents/roofing-quote.pdf',
  512000,
  'application/pdf',
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'Lift Specification Document',
  'Technical specification for elevator modernization',
  'Specification',
  'https://example.com/documents/lift-spec.pdf',
  1024000,
  'application/pdf',
  NOW()
);

-- Insert sample logs
INSERT INTO major_works_logs (
  project_id,
  action,
  description,
  timestamp,
  metadata,
  created_at
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Project Started',
  'Roof refurbishment project officially commenced with contractor on site',
  NOW() - INTERVAL '30 days',
  '{"contractor_present": true, "weather": "clear", "site_access": "unrestricted"}',
  NOW() - INTERVAL '30 days'
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Scaffold Erected',
  'Full scaffold erected around building perimeter for roof access',
  NOW() - INTERVAL '25 days',
  '{"scaffold_type": "full_perimeter", "safety_checks": "completed"}',
  NOW() - INTERVAL '25 days'
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Materials Delivered',
  'All roofing materials delivered and stored on site',
  NOW() - INTERVAL '20 days',
  '{"materials": ["tiles", "insulation", "underlay"], "storage_location": "ground_floor"}',
  NOW() - INTERVAL '20 days'
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Progress Update',
  '45% of roof tiles removed and structural repairs completed',
  NOW() - INTERVAL '10 days',
  '{"completion_percentage": 45, "issues_found": "minor_rot", "next_phase": "insulation_installation"}',
  NOW() - INTERVAL '10 days'
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'S20 Notice Issued',
  'Section 20 Notice of Intention issued to all leaseholders',
  NOW() - INTERVAL '15 days',
  '{"notice_period": "90_days", "consultation_deadline": "2025-09-15"}',
  NOW() - INTERVAL '15 days'
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  'Project Completed',
  'External wall insulation project completed successfully',
  NOW() - INTERVAL '5 days',
  '{"final_inspection": "passed", "certificates_issued": true, "warranty_period": "10_years"}',
  NOW() - INTERVAL '5 days'
);

-- Insert sample observations
INSERT INTO major_works_observations (
  project_id,
  observation_type,
  title,
  description,
  location,
  weather_conditions,
  personnel_present,
  created_at
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Site Visit',
  'Weekly Progress Inspection',
  'Roof tiles being removed systematically. Scaffold is secure and properly maintained. No safety issues observed.',
  'Main roof area',
  'Clear, 18°C',
  'Site manager, roofing contractor, building manager',
  NOW() - INTERVAL '7 days'
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Issue',
  'Minor Water Damage Found',
  'Small area of water damage discovered under existing tiles. Will be addressed during structural repairs.',
  'North-east corner, 3rd floor level',
  'Light rain',
  'Roofer, building manager',
  NOW() - INTERVAL '5 days'
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Milestone',
  'Structural Repairs Completed',
  'All structural repairs to roof timbers completed. Ready for insulation installation.',
  'Entire roof structure',
  'Clear, 20°C',
  'Structural engineer, roofing contractor, building manager',
  NOW() - INTERVAL '3 days'
);

-- Verify the data was inserted correctly
SELECT 
  'major_works_projects' as table_name,
  COUNT(*) as record_count
FROM major_works_projects
UNION ALL
SELECT 
  'major_works_documents' as table_name,
  COUNT(*) as record_count
FROM major_works_documents
UNION ALL
SELECT 
  'major_works_logs' as table_name,
  COUNT(*) as record_count
FROM major_works_logs
UNION ALL
SELECT 
  'major_works_observations' as table_name,
  COUNT(*) as record_count
FROM major_works_observations; 