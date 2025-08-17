-- Drop the existing communications_log table if it exists
DROP TABLE IF EXISTS communications_log CASCADE;

-- Create the communications_log table with the correct schema
CREATE TABLE communications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('email', 'letter', 'call')),
  building_id UUID REFERENCES buildings(id),
  unit_id UUID REFERENCES units(id),
  leaseholder_id UUID REFERENCES leaseholders(id),
  subject TEXT NOT NULL,
  content TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_by UUID REFERENCES auth.users(id),
  building_name TEXT,
  leaseholder_name TEXT,
  unit_number TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_communications_log_type ON communications_log(type);
CREATE INDEX idx_communications_log_building_id ON communications_log(building_id);
CREATE INDEX idx_communications_log_unit_id ON communications_log(unit_id);
CREATE INDEX idx_communications_log_leaseholder_id ON communications_log(leaseholder_id);
CREATE INDEX idx_communications_log_sent_by ON communications_log(sent_by);
CREATE INDEX idx_communications_log_sent_at ON communications_log(sent_at);
CREATE INDEX idx_communications_log_status ON communications_log(status);

-- Enable Row Level Security
ALTER TABLE communications_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for secure access
CREATE POLICY "Users can view their own communications" ON communications_log
  FOR SELECT USING (auth.uid() = sent_by);

CREATE POLICY "Users can insert their own communications" ON communications_log
  FOR INSERT WITH CHECK (auth.uid() = sent_by);

CREATE POLICY "Users can update their own communications" ON communications_log
  FOR UPDATE USING (auth.uid() = sent_by);

CREATE POLICY "Users can delete their own communications" ON communications_log
  FOR DELETE USING (auth.uid() = sent_by);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_communications_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_communications_log_updated_at
  BEFORE UPDATE ON communications_log
  FOR EACH ROW
  EXECUTE FUNCTION update_communications_log_updated_at();

-- Insert sample data for testing
INSERT INTO communications_log (
  type, 
  building_id, 
  unit_id, 
  leaseholder_id, 
  subject, 
  content, 
  sent_at, 
  sent_by, 
  building_name, 
  leaseholder_name, 
  unit_number, 
  status
) VALUES
  (
    'email',
    (SELECT id FROM buildings LIMIT 1),
    (SELECT id FROM units LIMIT 1),
    (SELECT id FROM leaseholders LIMIT 1),
    'Welcome to Your New Home',
    'Dear Resident, Welcome to your new home! We are pleased to have you as part of our community...',
    NOW() - INTERVAL '2 days',
    (SELECT id FROM auth.users LIMIT 1),
    'Sample Building',
    'John Smith',
    'Flat 1',
    'sent'
  ),
  (
    'letter',
    (SELECT id FROM buildings LIMIT 1),
    (SELECT id FROM units LIMIT 1),
    (SELECT id FROM leaseholders LIMIT 1),
    'Important Maintenance Notice',
    'Dear Resident, This letter is to inform you about upcoming maintenance work...',
    NOW() - INTERVAL '5 days',
    (SELECT id FROM auth.users LIMIT 1),
    'Sample Building',
    'Jane Doe',
    'Flat 2',
    'sent'
  ),
  (
    'email',
    (SELECT id FROM buildings LIMIT 1),
    (SELECT id FROM units LIMIT 1),
    (SELECT id FROM leaseholders LIMIT 1),
    'Monthly Newsletter',
    'Dear Residents, Here is your monthly newsletter with updates about our community...',
    NOW() - INTERVAL '1 week',
    (SELECT id FROM auth.users LIMIT 1),
    'Sample Building',
    'Bob Wilson',
    'Flat 3',
    'sent'
  ),
  (
    'letter',
    (SELECT id FROM buildings LIMIT 1),
    (SELECT id FROM units LIMIT 1),
    (SELECT id FROM leaseholders LIMIT 1),
    'Annual Service Charge Notice',
    'Dear Resident, Please find enclosed your annual service charge statement...',
    NOW() - INTERVAL '2 weeks',
    (SELECT id FROM auth.users LIMIT 1),
    'Sample Building',
    'Alice Johnson',
    'Flat 4',
    'sent'
  ),
  (
    'email',
    (SELECT id FROM buildings LIMIT 1),
    (SELECT id FROM units LIMIT 1),
    (SELECT id FROM leaseholders LIMIT 1),
    'Emergency Contact Update',
    'Dear Resident, Please ensure your emergency contact information is up to date...',
    NOW() - INTERVAL '3 weeks',
    (SELECT id FROM auth.users LIMIT 1),
    'Sample Building',
    'Charlie Brown',
    'Flat 5',
    'sent'
  );

-- Verify the table was created successfully
SELECT 
  'communications_log table created successfully' as status,
  COUNT(*) as total_communications,
  COUNT(CASE WHEN type = 'email' THEN 1 END) as emails,
  COUNT(CASE WHEN type = 'letter' THEN 1 END) as letters,
  COUNT(CASE WHEN type = 'call' THEN 1 END) as calls
FROM communications_log;
