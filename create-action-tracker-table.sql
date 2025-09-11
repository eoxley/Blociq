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
DROP TRIGGER IF EXISTS update_building_action_tracker_updated_at ON building_action_tracker;
CREATE TRIGGER update_building_action_tracker_updated_at 
    BEFORE UPDATE ON building_action_tracker 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE building_action_tracker ENABLE ROW LEVEL SECURITY;

-- Create UUID helper function for building access
CREATE OR REPLACE FUNCTION public.user_has_agency_building_access_uuid(building_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_agency_id UUID;
BEGIN
    -- Get user's agency_id from JWT
    user_agency_id := public.get_user_agency_id();
    
    -- If no agency_id in JWT, deny access
    IF user_agency_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if building belongs to user's agency
    RETURN EXISTS (
        SELECT 1 FROM public.buildings
        WHERE id = building_id_param
        AND agency_id = user_agency_id
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_has_agency_building_access_uuid(UUID) TO authenticated;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view action tracker items for their buildings" ON building_action_tracker;
DROP POLICY IF EXISTS "Users can insert action tracker items for their buildings" ON building_action_tracker;
DROP POLICY IF EXISTS "Users can update action tracker items they created" ON building_action_tracker;
DROP POLICY IF EXISTS "Users can delete action tracker items they created" ON building_action_tracker;

-- Create RLS policies for action tracker
-- Users can only access tracker items for buildings they have access to
CREATE POLICY "Users can view action tracker items for their buildings" ON building_action_tracker
    FOR SELECT USING (
        public.user_has_agency_building_access_uuid(building_id)
    );

CREATE POLICY "Users can insert action tracker items for their buildings" ON building_action_tracker
    FOR INSERT WITH CHECK (
        public.user_has_agency_building_access_uuid(building_id)
        AND created_by = public.get_user_id()
    );

CREATE POLICY "Users can update action tracker items they created" ON building_action_tracker
    FOR UPDATE USING (
        created_by = public.get_user_id()
        AND public.user_has_agency_building_access_uuid(building_id)
    );

CREATE POLICY "Users can delete action tracker items they created" ON building_action_tracker
    FOR DELETE USING (
        created_by = public.get_user_id()
        AND public.user_has_agency_building_access_uuid(building_id)
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
('2beeec1d-a94e-4058-b881-213d74cc6830', 'Review and update building emergency procedures', '2024-12-01', 'Annual review of evacuation plans and emergency contact lists', false, 'medium', 'Manual', NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO NOTHING;