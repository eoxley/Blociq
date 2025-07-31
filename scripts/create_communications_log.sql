-- Create communications_log table for tracking all communications
CREATE TABLE IF NOT EXISTS communications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'letter')),
  leaseholder_id TEXT NOT NULL,
  leaseholder_name TEXT NOT NULL,
  building_name TEXT,
  unit_number TEXT,
  subject TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_communications_log_type ON communications_log(type);
CREATE INDEX IF NOT EXISTS idx_communications_log_leaseholder_id ON communications_log(leaseholder_id);
CREATE INDEX IF NOT EXISTS idx_communications_log_user_id ON communications_log(user_id);
CREATE INDEX IF NOT EXISTS idx_communications_log_created_at ON communications_log(created_at);
CREATE INDEX IF NOT EXISTS idx_communications_log_status ON communications_log(status);

-- Enable Row Level Security
ALTER TABLE communications_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for secure access
-- Users can view their own communications
CREATE POLICY "Users can view their own communications" ON communications_log
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own communications
CREATE POLICY "Users can insert their own communications" ON communications_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own communications
CREATE POLICY "Users can update their own communications" ON communications_log
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own communications
CREATE POLICY "Users can delete their own communications" ON communications_log
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_communications_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_communications_log_updated_at ON communications_log;
CREATE TRIGGER update_communications_log_updated_at
  BEFORE UPDATE ON communications_log
  FOR EACH ROW
  EXECUTE FUNCTION update_communications_log_updated_at();

-- Insert sample data for testing
INSERT INTO communications_log (type, leaseholder_id, leaseholder_name, building_name, unit_number, subject, content, status, user_id)
SELECT 
  'call',
  'sample-leaseholder-1',
  'John Smith',
  'Sample Building',
  'Flat 1',
  'Phone Call',
  'Called John Smith at +44 20 1234 5678',
  'sent',
  (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM communications_log WHERE leaseholder_id = 'sample-leaseholder-1'
);

INSERT INTO communications_log (type, leaseholder_id, leaseholder_name, building_name, unit_number, subject, content, status, user_id)
SELECT 
  'email',
  'sample-leaseholder-2',
  'Jane Doe',
  'Sample Building',
  'Flat 2',
  'Maintenance Update',
  'Dear Jane, This is to inform you that the maintenance work has been completed...',
  'sent',
  (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM communications_log WHERE leaseholder_id = 'sample-leaseholder-2'
);

INSERT INTO communications_log (type, leaseholder_id, leaseholder_name, building_name, unit_number, subject, content, status, user_id)
SELECT 
  'letter',
  'sample-leaseholder-3',
  'Bob Wilson',
  'Sample Building',
  'Flat 3',
  'Important Notice',
  'Dear Bob, Please find enclosed important information regarding...',
  'sent',
  (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM communications_log WHERE leaseholder_id = 'sample-leaseholder-3'
);

-- Verify the table was created successfully
SELECT 
  'communications_log table created successfully' as status,
  COUNT(*) as total_communications,
  COUNT(CASE WHEN type = 'call' THEN 1 END) as calls,
  COUNT(CASE WHEN type = 'email' THEN 1 END) as emails,
  COUNT(CASE WHEN type = 'letter' THEN 1 END) as letters
FROM communications_log; 