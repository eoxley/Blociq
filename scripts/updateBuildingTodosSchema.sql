-- Update building_todos table to match new requirements
-- Add new columns and update existing ones

-- First, add the new columns if they don't exist
ALTER TABLE building_todos ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE building_todos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed'));
ALTER TABLE building_todos ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE building_todos ADD COLUMN IF NOT EXISTS created_by UUID;

-- Update the is_complete column to use status instead
-- This is a migration step - we'll keep is_complete for backward compatibility
-- but the new status field will be the primary way to track completion

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_building_todos_status ON building_todos(status);
CREATE INDEX IF NOT EXISTS idx_building_todos_assigned_to ON building_todos(assigned_to);
CREATE INDEX IF NOT EXISTS idx_building_todos_created_by ON building_todos(created_by);

-- Update existing data to use the new status field
UPDATE building_todos 
SET status = CASE 
  WHEN is_complete = true THEN 'completed'
  ELSE 'pending'
END
WHERE status IS NULL;

-- Add some sample data with the new schema
INSERT INTO building_todos (building_id, title, description, status, due_date, priority, assigned_to, created_by) VALUES
(1, 'Schedule fire safety inspection', 'Annual fire safety inspection required by local authority', 'pending', current_date + interval '7 days', 'High', NULL, NULL),
(1, 'Review service charge accounts', 'Prepare annual service charge accounts for leaseholders', 'in_progress', current_date + interval '14 days', 'Medium', NULL, NULL),
(1, 'Update building insurance policy', 'Renew building insurance with updated coverage', 'completed', current_date - interval '2 days', 'High', NULL, NULL),
(1, 'Arrange lift maintenance', 'Schedule quarterly lift maintenance with contractor', 'pending', current_date + interval '3 days', 'Medium', NULL, NULL),
(1, 'Check emergency lighting systems', 'Test all emergency lighting and exit signs', 'pending', current_date + interval '1 day', 'High', NULL, NULL),
(2, 'Complete EWS1 assessment', 'External wall system assessment for building safety', 'pending', current_date + interval '30 days', 'High', NULL, NULL),
(2, 'Update leaseholder contact details', 'Verify and update all leaseholder contact information', 'pending', current_date + interval '5 days', 'Low', NULL, NULL),
(2, 'Review building maintenance schedule', 'Annual review of maintenance procedures and schedules', 'pending', current_date + interval '10 days', 'Medium', NULL, NULL),
(4, 'Arrange gas safety inspection', 'Annual gas safety inspection for all units', 'pending', current_date + interval '2 days', 'High', NULL, NULL),
(4, 'Update fire risk assessment', 'Review and update fire risk assessment document', 'pending', current_date + interval '7 days', 'High', NULL, NULL),
(4, 'Review and approve budget for roof repairs', 'Review contractor quotes and approve roof repair budget', 'pending', current_date + interval '14 days', 'Medium', NULL, NULL),
(4, 'Schedule annual AGM', 'Arrange annual general meeting for leaseholders', 'pending', current_date + interval '21 days', 'Medium', NULL, NULL),
(4, 'Check and test fire alarms', 'Monthly fire alarm system test and inspection', 'completed', current_date - interval '1 day', 'High', NULL, NULL),
(4, 'Update building access codes', 'Change access codes for building security', 'pending', current_date + interval '3 days', 'Low', NULL, NULL)
ON CONFLICT DO NOTHING;

-- Create a view for easier querying
CREATE OR REPLACE VIEW building_todos_view AS
SELECT 
  bt.id,
  bt.building_id,
  b.name as building_name,
  bt.title,
  bt.description,
  bt.status,
  bt.due_date,
  bt.priority,
  bt.assigned_to,
  bt.created_by,
  bt.created_at,
  bt.updated_at,
  CASE 
    WHEN bt.status = 'completed' THEN true
    ELSE false
  END as is_complete
FROM building_todos bt
LEFT JOIN buildings b ON bt.building_id = b.id;

-- Add RLS (Row Level Security) policies
-- Enable RLS on the table
ALTER TABLE building_todos ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read todos for buildings they have access to
CREATE POLICY "Users can view building todos" ON building_todos
  FOR SELECT USING (true); -- For now, allow all reads. In production, you'd add building access checks

-- Create policy for users to insert todos
CREATE POLICY "Users can create building todos" ON building_todos
  FOR INSERT WITH CHECK (true); -- For now, allow all inserts. In production, you'd add building access checks

-- Create policy for users to update todos they created
CREATE POLICY "Users can update building todos" ON building_todos
  FOR UPDATE USING (true); -- For now, allow all updates. In production, you'd add ownership checks

-- Create policy for users to delete todos they created
CREATE POLICY "Users can delete building todos" ON building_todos
  FOR DELETE USING (true); -- For now, allow all deletes. In production, you'd add ownership checks 