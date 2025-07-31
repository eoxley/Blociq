-- Create building_todos table
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

-- Enable Row Level Security
ALTER TABLE building_todos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view todos for their buildings" ON building_todos
  FOR SELECT USING (
    building_id IN (
      SELECT building_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert todos for their buildings" ON building_todos
  FOR INSERT WITH CHECK (
    building_id IN (
      SELECT building_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update todos for their buildings" ON building_todos
  FOR UPDATE USING (
    building_id IN (
      SELECT building_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete todos for their buildings" ON building_todos
  FOR DELETE USING (
    building_id IN (
      SELECT building_id FROM profiles WHERE id = auth.uid()
    )
  );

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