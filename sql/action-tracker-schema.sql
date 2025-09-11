-- Action Tracker Schema for BlocIQ
-- Building-specific action/task tracking system

-- Create the building_action_tracker table
CREATE TABLE IF NOT EXISTS building_action_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  item_text text NOT NULL,
  due_date date,
  notes text,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  priority text CHECK (priority IN ('low','medium','high')) DEFAULT 'medium',
  source text DEFAULT 'Manual' CHECK (source IN ('Manual', 'Meeting', 'Call', 'Email')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_building_action_tracker_building_id ON building_action_tracker(building_id);
CREATE INDEX IF NOT EXISTS idx_building_action_tracker_due_date ON building_action_tracker(due_date);
CREATE INDEX IF NOT EXISTS idx_building_action_tracker_completed ON building_action_tracker(completed);
CREATE INDEX IF NOT EXISTS idx_building_action_tracker_priority ON building_action_tracker(priority);
CREATE INDEX IF NOT EXISTS idx_building_action_tracker_source ON building_action_tracker(source);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for updated_at
CREATE TRIGGER update_building_action_tracker_updated_at 
    BEFORE UPDATE ON building_action_tracker 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE building_action_tracker ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for action tracker
-- Users can only access tracker items for buildings they have access to
CREATE POLICY "Users can view action tracker items for their buildings" ON building_action_tracker
    FOR SELECT USING (
        building_id IN (
            SELECT b.id FROM buildings b 
            INNER JOIN profiles p ON p.id = auth.uid()
            -- Add your building access logic here based on your existing RLS patterns
        )
    );

CREATE POLICY "Users can insert action tracker items for their buildings" ON building_action_tracker
    FOR INSERT WITH CHECK (
        building_id IN (
            SELECT b.id FROM buildings b 
            INNER JOIN profiles p ON p.id = auth.uid()
            -- Add your building access logic here based on your existing RLS patterns
        )
        AND created_by = auth.uid()
    );

CREATE POLICY "Users can update action tracker items they created" ON building_action_tracker
    FOR UPDATE USING (
        created_by = auth.uid()
        AND building_id IN (
            SELECT b.id FROM buildings b 
            INNER JOIN profiles p ON p.id = auth.uid()
            -- Add your building access logic here based on your existing RLS patterns
        )
    );

CREATE POLICY "Users can delete action tracker items they created" ON building_action_tracker
    FOR DELETE USING (
        created_by = auth.uid()
        AND building_id IN (
            SELECT b.id FROM buildings b 
            INNER JOIN profiles p ON p.id = auth.uid()
            -- Add your building access logic here based on your existing RLS patterns
        )
    );

-- Insert seed data for testing (building ID: 2beeec1d-a94e-4058-b881-213d74cc6830)
INSERT INTO building_action_tracker (building_id, item_text, due_date, notes, completed, priority, source, created_at) VALUES
('2beeec1d-a94e-4058-b881-213d74cc6830', 'Follow up on fire safety certificate renewal', '2024-12-15', 'Contact fire safety contractor to schedule renewal inspection', false, 'high', 'Meeting', NOW() - INTERVAL '2 days'),
('2beeec1d-a94e-4058-b881-213d74cc6830', 'Repair communal area lighting on 2nd floor', '2024-11-20', 'Reported by leaseholder in unit 2B - flickering lights in hallway', false, 'medium', 'Call', NOW() - INTERVAL '1 day'),
('2beeec1d-a94e-4058-b881-213d74cc6830', 'Schedule building insurance review', '2024-10-15', 'Policy expires in January - need to review coverage options', true, 'medium', 'Email', NOW() - INTERVAL '5 days'),
('2beeec1d-a94e-4058-b881-213d74cc6830', 'Update building access codes', '2024-11-01', 'Change main entrance code after recent leaseholder turnover', true, 'low', 'Manual', NOW() - INTERVAL '3 days'),
('2beeec1d-a94e-4058-b881-213d74cc6830', 'Organize annual building meeting', '2024-12-30', 'Send out meeting notices and prepare agenda items', false, 'low', 'Manual', NOW() - INTERVAL '1 day'),
('2beeec1d-a94e-4058-b881-213d74cc6830', 'Check and service lift emergency phone', NULL, 'Monthly maintenance check - ensure emergency communication working', false, 'medium', 'Meeting', NOW()),
('2beeec1d-a94e-4058-b881-213d74cc6830', 'Replace broken intercom for unit 3A', '2024-11-10', 'Leaseholder reported intercom not working - need to schedule repair', true, 'high', 'Call', NOW() - INTERVAL '4 days'),
('2beeec1d-a94e-4058-b881-213d74cc6830', 'Review and update building emergency procedures', '2024-12-01', 'Annual review of evacuation plans and emergency contact lists', false, 'medium', 'Manual', NOW() - INTERVAL '6 hours');

-- Grant necessary permissions (adjust based on your existing permission structure)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON building_action_tracker TO authenticated;
-- GRANT USAGE ON SCHEMA public TO authenticated;