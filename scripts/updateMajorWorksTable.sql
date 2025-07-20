-- Add new Section 20 fields to major_works table
ALTER TABLE major_works 
ADD COLUMN IF NOT EXISTS notice_of_reason_issued TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS funds_confirmed TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS contractor_appointed TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS surveyor_appointed TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS leaseholder_meeting_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS consultation_period_1_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS consultation_period_2_end TIMESTAMP WITH TIME ZONE;

-- Create documents table for project files
CREATE TABLE IF NOT EXISTS major_works_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES major_works(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT,
  uploaded_by TEXT DEFAULT 'Property Manager',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  document_type TEXT DEFAULT 'general', -- 'notice', 'estimates', 'meeting_minutes', 'surveyor_report', etc.
  description TEXT
);

-- Enable RLS on documents table
ALTER TABLE major_works_documents ENABLE ROW LEVEL SECURITY;

-- Create policy for documents
CREATE POLICY "Allow all operations on major_works_documents" ON major_works_documents
  FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_major_works_documents_project_id ON major_works_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_major_works_documents_uploaded_at ON major_works_documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_major_works_documents_type ON major_works_documents(document_type);

-- Update existing projects with sample data for new fields
UPDATE major_works 
SET 
  notice_of_reason_issued = CASE 
    WHEN id = '550e8400-e29b-41d4-a716-446655440001' THEN '2025-08-05 14:00:00+00'
    ELSE NULL
  END,
  funds_confirmed = CASE 
    WHEN id = '550e8400-e29b-41d4-a716-446655440001' THEN '2025-08-15 10:00:00+00'
    WHEN id = '550e8400-e29b-41d4-a716-446655440002' THEN '2025-07-20 14:30:00+00'
    WHEN id = '550e8400-e29b-41d4-a716-446655440003' THEN '2025-09-10 09:15:00+00'
    ELSE NULL
  END,
  contractor_appointed = CASE 
    WHEN id = '550e8400-e29b-41d4-a716-446655440001' THEN '2025-08-20 11:00:00+00'
    WHEN id = '550e8400-e29b-41d4-a716-446655440002' THEN '2025-07-25 15:00:00+00'
    WHEN id = '550e8400-e29b-41d4-a716-446655440003' THEN '2025-09-15 10:30:00+00'
    ELSE NULL
  END,
  surveyor_appointed = CASE 
    WHEN id = '550e8400-e29b-41d4-a716-446655440001' THEN '2025-07-10 13:00:00+00'
    WHEN id = '550e8400-e29b-41d4-a716-446655440002' THEN '2025-06-20 16:00:00+00'
    WHEN id = '550e8400-e29b-41d4-a716-446655440003' THEN '2025-08-05 11:00:00+00'
    ELSE NULL
  END,
  leaseholder_meeting_date = CASE 
    WHEN id = '550e8400-e29b-41d4-a716-446655440001' THEN '2025-07-25 18:00:00+00'
    WHEN id = '550e8400-e29b-41d4-a716-446655440002' THEN '2025-07-10 19:00:00+00'
    WHEN id = '550e8400-e29b-41d4-a716-446655440003' THEN '2025-08-15 18:30:00+00'
    ELSE NULL
  END,
  consultation_period_1_end = CASE 
    WHEN id = '550e8400-e29b-41d4-a716-446655440001' THEN '2025-07-31 23:59:59+00'
    WHEN id = '550e8400-e29b-41d4-a716-446655440002' THEN '2025-07-15 23:59:59+00'
    WHEN id = '550e8400-e29b-41d4-a716-446655440003' THEN '2025-08-31 23:59:59+00'
    ELSE NULL
  END,
  consultation_period_2_end = CASE 
    WHEN id = '550e8400-e29b-41d4-a716-446655440001' THEN '2025-08-30 23:59:59+00'
    WHEN id = '550e8400-e29b-41d4-a716-446655440002' THEN '2025-08-14 23:59:59+00'
    WHEN id = '550e8400-e29b-41d4-a716-446655440003' THEN '2025-09-30 23:59:59+00'
    ELSE NULL
  END
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003'
);

-- Insert sample documents
INSERT INTO major_works_documents (
  project_id,
  file_name,
  file_size,
  file_type,
  document_type,
  description,
  uploaded_by
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Section_20_Notice_Roof_Refurbishment.pdf',
  245760,
  'application/pdf',
  'notice',
  'Notice of Intention for roof refurbishment works',
  'Property Manager'
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Notice_of_Reason_Roof_Works.pdf',
  189440,
  'application/pdf',
  'notice_of_reason',
  'Notice of Reason issued due to leaseholder objections',
  'Property Manager'
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Contractor_Estimates_Roof_Works.xlsx',
  189440,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'estimates',
  'Three contractor estimates for roof refurbishment',
  'Property Manager'
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Leaseholder_Meeting_Minutes_July_2025.pdf',
  156672,
  'application/pdf',
  'meeting_minutes',
  'Minutes from leaseholder consultation meeting',
  'Property Manager'
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'Elevator_Modernization_Notice.pdf',
  198656,
  'application/pdf',
  'notice',
  'Notice of Intention for elevator modernization',
  'Property Manager'
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  'Surveyor_Report_External_Walls.pdf',
  312832,
  'application/pdf',
  'surveyor_report',
  'Structural surveyor report for external wall insulation',
  'Surveyor'
);

-- Verify the updates
SELECT 
  id,
  title,
  notice_of_reason_issued,
  funds_confirmed,
  contractor_appointed,
  surveyor_appointed,
  leaseholder_meeting_date
FROM major_works 
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003'
);

-- Show sample documents
SELECT 
  d.id,
  d.file_name,
  d.document_type,
  d.description,
  d.uploaded_at,
  m.title as project_title
FROM major_works_documents d
JOIN major_works m ON d.project_id = m.id
ORDER BY d.uploaded_at DESC; 