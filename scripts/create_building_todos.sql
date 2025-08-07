-- Create building_todos table for managing building-specific tasks
CREATE TABLE IF NOT EXISTS building_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  is_complete BOOLEAN DEFAULT false,
  due_date TIMESTAMP WITH TIME ZONE,
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  assigned_to TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_building_todos_building_id ON building_todos(building_id);
CREATE INDEX IF NOT EXISTS idx_building_todos_status ON building_todos(status);
CREATE INDEX IF NOT EXISTS idx_building_todos_due_date ON building_todos(due_date);
CREATE INDEX IF NOT EXISTS idx_building_todos_priority ON building_todos(priority);
CREATE INDEX IF NOT EXISTS idx_building_todos_created_at ON building_todos(created_at);
CREATE INDEX IF NOT EXISTS idx_building_todos_is_complete ON building_todos(is_complete);

-- Enable Row Level Security
ALTER TABLE building_todos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for secure access (simplified without profiles table)
-- Users can view todos for any building (we'll filter by user in the application)
CREATE POLICY "Users can view todos" ON building_todos
  FOR SELECT USING (true);

-- Users can insert todos for any building (we'll validate in the application)
CREATE POLICY "Users can insert todos" ON building_todos
  FOR INSERT WITH CHECK (true);

-- Users can update todos for any building (we'll validate in the application)
CREATE POLICY "Users can update todos" ON building_todos
  FOR UPDATE USING (true);

-- Users can delete todos for any building (we'll validate in the application)
CREATE POLICY "Users can delete todos" ON building_todos
  FOR DELETE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_building_todos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_building_todos_updated_at ON building_todos;
CREATE TRIGGER update_building_todos_updated_at
  BEFORE UPDATE ON building_todos
  FOR EACH ROW
  EXECUTE FUNCTION update_building_todos_updated_at();

-- Insert sample data for testing
INSERT INTO building_todos (building_id, title, description, status, priority, due_date, is_complete)
SELECT 
  b.id,
  'Heating System Maintenance',
  'Annual heating system inspection and maintenance',
  'pending',
  'High',
  NOW() + INTERVAL '30 days',
  false
FROM buildings b
WHERE NOT EXISTS (
  SELECT 1 FROM building_todos 
  WHERE building_id = b.id AND title = 'Heating System Maintenance'
)
LIMIT 1;

INSERT INTO building_todos (building_id, title, description, status, priority, due_date, is_complete)
SELECT 
  b.id,
  'Fire Safety Check',
  'Monthly fire safety equipment inspection',
  'in_progress',
  'Medium',
  NOW() + INTERVAL '7 days',
  false
FROM buildings b
WHERE NOT EXISTS (
  SELECT 1 FROM building_todos 
  WHERE building_id = b.id AND title = 'Fire Safety Check'
)
LIMIT 1;

INSERT INTO building_todos (building_id, title, description, status, priority, due_date, is_complete)
SELECT 
  b.id,
  'Electrical Inspection',
  'Quarterly electrical system inspection',
  'completed',
  'Low',
  NOW() - INTERVAL '7 days',
  true
FROM buildings b
WHERE NOT EXISTS (
  SELECT 1 FROM building_todos 
  WHERE building_id = b.id AND title = 'Electrical Inspection'
)
LIMIT 1;

INSERT INTO building_todos (building_id, title, description, status, priority, due_date, is_complete)
SELECT 
  b.id,
  'Gas Safety Certificate',
  'Annual gas safety inspection and certificate renewal',
  'pending',
  'High',
  NOW() + INTERVAL '14 days',
  false
FROM buildings b
WHERE NOT EXISTS (
  SELECT 1 FROM building_todos 
  WHERE building_id = b.id AND title = 'Gas Safety Certificate'
)
LIMIT 1;

INSERT INTO building_todos (building_id, title, description, status, priority, due_date, is_complete)
SELECT 
  b.id,
  'Energy Performance Assessment',
  'Energy efficiency assessment and EPC renewal',
  'in_progress',
  'Medium',
  NOW() + INTERVAL '60 days',
  false
FROM buildings b
WHERE NOT EXISTS (
  SELECT 1 FROM building_todos 
  WHERE building_id = b.id AND title = 'Energy Performance Assessment'
)
LIMIT 1;

-- Verify the table was created successfully
SELECT 
  'building_todos table created successfully' as status,
  COUNT(*) as total_todos,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_todos,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_todos,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_todos
FROM building_todos; 