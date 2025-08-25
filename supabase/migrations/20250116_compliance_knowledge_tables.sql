-- Compliance Knowledge System Tables
-- This migration creates tables to store industry standards and guidance
-- that will enhance AI responses with professional compliance knowledge

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for storing compliance guidance documents
CREATE TABLE IF NOT EXISTS public.compliance_guidance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  version TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  relevance_score INTEGER DEFAULT 100,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing compliance standards and requirements
CREATE TABLE IF NOT EXISTS public.compliance_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT[] NOT NULL DEFAULT '{}',
  frequency TEXT NOT NULL,
  legal_basis TEXT NOT NULL,
  guidance_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_guidance_category ON public.compliance_guidance(category);
CREATE INDEX IF NOT EXISTS idx_compliance_guidance_relevance ON public.compliance_guidance(relevance_score);
CREATE INDEX IF NOT EXISTS idx_compliance_guidance_tags ON public.compliance_guidance USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_compliance_standards_category ON public.compliance_standards(category);
CREATE INDEX IF NOT EXISTS idx_compliance_standards_name ON public.compliance_standards(name);

-- Enable Row Level Security
ALTER TABLE public.compliance_guidance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_standards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Allow authenticated users to read compliance guidance" ON public.compliance_guidance
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read compliance standards" ON public.compliance_standards
  FOR SELECT USING (auth.role() = 'authenticated');

-- Insert sample compliance standards based on your master list
INSERT INTO public.compliance_standards (name, category, description, requirements, frequency, legal_basis, guidance_notes) VALUES
-- Fire & Life Safety Standards
('BS 9999', 'Fire & Life Safety', 'Code of practice for fire safety in the design, management and use of buildings', 
  ARRAY['Fire risk assessment', 'Fire safety management plan', 'Emergency procedures', 'Staff training'], 
  'Annual', 'Building Regulations Approved Document B', 'Essential for all buildings, especially high-rise'),

('BS 5839', 'Fire & Life Safety', 'Fire detection and fire alarm systems for buildings', 
  ARRAY['System design', 'Installation', 'Commissioning', 'Maintenance', 'Testing'], 
  'Monthly testing, annual service', 'Fire Safety Order 2005', 'Critical for life safety systems'),

('Building Regulations Approved Document B', 'Fire & Life Safety', 'Fire safety requirements for buildings', 
  ARRAY['Means of escape', 'Fire resistance', 'Fire detection', 'Fire fighting'], 
  'Design stage, material changes', 'Building Act 1984', 'Legal requirement for all new buildings and major alterations'),

-- Electrical Standards
('BS 7671', 'Electrical & Mechanical', 'Requirements for Electrical Installations (IET Wiring Regulations)', 
  ARRAY['Design', 'Installation', 'Inspection', 'Testing', 'Certification'], 
  'Every 5 years (EICR)', 'Electricity at Work Regulations 1989', 'Legal requirement for all electrical installations'),

('BS EN 62305', 'Electrical & Mechanical', 'Protection against lightning', 
  ARRAY['Risk assessment', 'System design', 'Installation', 'Testing'], 
  'Annual testing', 'Building Regulations', 'Required for buildings over 15m or in high-risk areas'),

-- Water Hygiene Standards
('ACoP L8', 'Water Hygiene & Drainage', 'Legionnaires disease: The control of legionella bacteria in water systems', 
  ARRAY['Risk assessment', 'Control measures', 'Monitoring', 'Record keeping'], 
  'Annual assessment, regular monitoring', 'Health and Safety at Work Act 1974', 'Legal requirement for all water systems'),

('HSG274', 'Water Hygiene & Drainage', 'Legionnaires disease: Technical guidance', 
  ARRAY['System design', 'Control measures', 'Monitoring procedures', 'Maintenance schedules'], 
  'Annual review', 'Health and Safety at Work Act 1974', 'Detailed technical guidance for compliance'),

-- Asbestos Standards
('CAR 2012', 'Structural, Access & Systems', 'Control of Asbestos Regulations 2012', 
  ARRAY['Survey', 'Risk assessment', 'Management plan', 'Training'], 
  'Survey every 5 years, annual review', 'Control of Asbestos Regulations 2012', 'Legal requirement for all buildings'),

('HSG264', 'Structural, Access & Systems', 'Asbestos: The surveyors guide', 
  ARRAY['Survey methodology', 'Risk assessment', 'Reporting', 'Management recommendations'], 
  'Survey every 5 years', 'Control of Asbestos Regulations 2012', 'Professional guidance for surveyors'),

-- Building Safety Standards
('Building Safety Act 2022', 'Building Safety Act (BSA / HRB)', 'Building safety and standards for higher-risk buildings', 
  ARRAY['Registration', 'Safety case report', 'Golden thread', 'Resident engagement'], 
  'Ongoing compliance', 'Building Safety Act 2022', 'New legal framework for high-rise buildings'),

('LOLER 1998', 'Electrical & Mechanical', 'Lifting Operations and Lifting Equipment Regulations 1998', 
  ARRAY['Equipment design', 'Installation', 'Maintenance', 'Inspection', 'Testing'], 
  '6-monthly inspection, annual certification', 'Lifting Operations and Lifting Equipment Regulations 1998', 'Legal requirement for all lifting equipment')

ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  requirements = EXCLUDED.requirements,
  frequency = EXCLUDED.frequency,
  legal_basis = EXCLUDED.legal_basis,
  guidance_notes = EXCLUDED.guidance_notes,
  updated_at = NOW();

-- Insert sample compliance guidance documents
INSERT INTO public.compliance_guidance (category, title, description, content, source, version, relevance_score, tags) VALUES
-- Fire Safety Guidance
('Fire & Life Safety', 'Fire Risk Assessment Best Practice Guide', 
  'Comprehensive guide to conducting fire risk assessments in residential buildings',
  'Fire risk assessments should be conducted by competent persons with appropriate training and experience. The assessment should identify fire hazards, evaluate risks, and implement control measures. Key areas to assess include: means of escape, fire detection and warning systems, fire fighting equipment, and emergency procedures. Regular reviews are essential, especially after significant changes to the building or its use.',
  'HSE Guidance', '2023', 95, ARRAY['fire safety', 'risk assessment', 'best practice']),

('Fire & Life Safety', 'Emergency Lighting System Maintenance Guide',
  'Guidance on maintaining emergency lighting systems in compliance with BS 5266',
  'Emergency lighting systems require monthly functional testing and annual duration testing. Monthly tests should verify that all emergency luminaires illuminate when the normal power supply is interrupted. Annual tests should ensure the system operates for the full rated duration. All tests must be recorded in a log book, and any defects must be rectified immediately.',
  'BSI Standards', '2023', 90, ARRAY['emergency lighting', 'maintenance', 'testing']),

-- Electrical Safety Guidance
('Electrical & Mechanical', 'EICR Testing and Certification Guide',
  'Professional guidance on Electrical Installation Condition Reports',
  'EICR testing should be conducted every 5 years for domestic installations and every 3 years for commercial premises. The inspection should cover all accessible parts of the electrical installation, including consumer units, wiring, switches, and socket outlets. Testing should include visual inspection, testing of protective devices, and verification of circuit continuity. All findings must be documented in a detailed report.',
  'IET Guidance', '2023', 92, ARRAY['electrical', 'EICR', 'testing', 'certification']),

-- Water Hygiene Guidance
('Water Hygiene & Drainage', 'Legionella Control in Domestic Water Systems',
  'Guidance on controlling legionella bacteria in residential water systems',
  'Legionella control requires regular risk assessment and monitoring of water systems. Key control measures include: maintaining water temperatures outside the 20-45°C range where possible, regular cleaning and disinfection of water tanks, and monitoring of water quality. Risk assessments should be reviewed annually or when there are significant changes to the water system.',
  'HSE Guidance', '2023', 88, ARRAY['legionella', 'water hygiene', 'risk assessment']),

-- Asbestos Management Guidance
('Structural, Access & Systems', 'Asbestos Management in Residential Buildings',
  'Guidance on managing asbestos-containing materials in residential properties',
  'Asbestos management requires a comprehensive survey to identify all asbestos-containing materials, followed by risk assessment and management planning. The management plan should include: location of ACMs, risk assessment, control measures, monitoring procedures, and emergency procedures. Regular re-inspections should be conducted annually, and all staff must receive appropriate training.',
  'HSE Guidance', '2023', 85, ARRAY['asbestos', 'management', 'survey', 'risk assessment'])

ON CONFLICT (title) DO UPDATE SET
  description = EXCLUDED.description,
  content = EXCLUDED.content,
  source = EXCLUDED.source,
  version = EXCLUDED.version,
  relevance_score = EXCLUDED.relevance_score,
  tags = EXCLUDED.tags,
  updated_at = NOW();

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_compliance_guidance_updated_at 
    BEFORE UPDATE ON public.compliance_guidance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_standards_updated_at 
    BEFORE UPDATE ON public.compliance_standards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for easy access to compliance knowledge
CREATE OR REPLACE VIEW public.compliance_knowledge_summary AS
SELECT 
  'guidance' as type,
  id,
  category,
  title,
  description,
  source,
  version,
  relevance_score,
  tags,
  created_at,
  updated_at
FROM public.compliance_guidance
UNION ALL
SELECT 
  'standard' as type,
  id,
  category,
  name as title,
  description,
  'Regulation' as source,
  'Current' as version,
  100 as relevance_score,
  ARRAY[category] as tags,
  created_at,
  updated_at
FROM public.compliance_standards;

-- Grant access to the view
GRANT SELECT ON public.compliance_knowledge_summary TO authenticated;

-- Insert some additional compliance standards for comprehensive coverage
INSERT INTO public.compliance_standards (name, category, description, requirements, frequency, legal_basis, guidance_notes) VALUES
-- Additional Fire Safety Standards
('Fire Safety Order 2005', 'Fire & Life Safety', 'Regulatory Reform (Fire Safety) Order 2005', 
  ARRAY['Fire risk assessment', 'Fire safety measures', 'Emergency procedures', 'Staff training'], 
  'Ongoing compliance', 'Fire Safety Order 2005', 'Primary legislation for fire safety in non-domestic premises'),

('BS 5266', 'Fire & Life Safety', 'Emergency escape lighting systems', 
  ARRAY['System design', 'Installation', 'Testing', 'Maintenance'], 
  'Monthly testing, annual duration test', 'Building Regulations', 'Standard for emergency lighting systems'),

-- Additional Electrical Standards
('PAT Testing', 'Electrical & Mechanical', 'Portable Appliance Testing', 
  ARRAY['Visual inspection', 'Earth continuity test', 'Insulation resistance test'], 
  'Annual for communal equipment', 'Electricity at Work Regulations 1989', 'Required for all portable electrical equipment'),

-- Additional Water Standards
('Water Supply Regulations 1999', 'Water Hygiene & Drainage', 'Water supply regulations for buildings', 
  ARRAY['Water quality', 'System design', 'Backflow prevention', 'Regular testing'], 
  'Annual testing', 'Water Industry Act 1991', 'Legal requirement for all water systems'),

-- Additional Structural Standards
('Building Act 1984', 'Structural, Access & Systems', 'Primary legislation for building control', 
  ARRAY['Building regulations compliance', 'Building control approval', 'Inspection during construction'], 
  'Design and construction stages', 'Building Act 1984', 'Primary legislation for all building work'),

-- Additional Insurance Standards
('Building Insurance Requirements', 'Insurance & Risk', 'Legal requirements for building insurance', 
  ARRAY['Adequate coverage', 'Regular review', 'Claims handling', 'Policy documentation'], 
  'Annual renewal', 'Lease terms and legislation', 'Required by most leases and mortgages'),

-- Additional Governance Standards
('Companies Act 2006', 'Leasehold / Governance', 'Company law requirements for RMCs and RTMs', 
  ARRAY['Annual accounts', 'Company filings', 'Board meetings', 'Member communications'], 
  'Annual compliance', 'Companies Act 2006', 'Legal requirement for all registered companies')

ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  requirements = EXCLUDED.requirements,
  frequency = EXCLUDED.frequency,
  legal_basis = EXCLUDED.legal_basis,
  guidance_notes = EXCLUDED.guidance_notes,
  updated_at = NOW();
