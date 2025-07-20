-- Create major_works_logs table for timeline events and observations
CREATE TABLE IF NOT EXISTS major_works_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES major_works(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  notes TEXT,
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE major_works_logs ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (for development)
CREATE POLICY "Allow all operations on major_works_logs" ON major_works_logs
  FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_major_works_logs_project_id ON major_works_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_major_works_logs_timestamp ON major_works_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_major_works_logs_created_at ON major_works_logs(created_at DESC);

-- Insert some sample logs for existing projects
INSERT INTO major_works_logs (
  project_id,
  title,
  notes,
  created_by,
  timestamp
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Section 20 Notice Issued',
  'Notice of Intention for roof refurbishment sent to all leaseholders. Consultation period begins.',
  'Property Manager',
  '2025-07-01 09:00:00+00'
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Consultation Feedback Received',
  'Received responses from 8 out of 12 leaseholders. Majority support the project with minor concerns about timing.',
  'Property Manager',
  '2025-07-15 14:30:00+00'
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'Estimates Stage Completed',
  'Three contractor estimates received and reviewed. Selected ABC Elevators Ltd for the project.',
  'Property Manager',
  '2025-06-15 11:00:00+00'
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  'Works Commenced',
  'External wall insulation installation started. Scaffolding erected and work progressing on schedule.',
  'Site Supervisor',
  '2025-08-20 08:00:00+00'
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  'Project Completed',
  'External wall insulation project completed successfully. Final inspection passed and scaffolding removed.',
  'Site Supervisor',
  '2025-10-31 17:00:00+00'
);

-- Verify the data was inserted
SELECT 
  l.id,
  l.title,
  l.notes,
  l.created_by,
  l.timestamp,
  m.title as project_title
FROM major_works_logs l
JOIN major_works m ON l.project_id = m.id
ORDER BY l.timestamp DESC; 