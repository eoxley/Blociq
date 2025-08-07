-- 🔐 RLS Policies for BlocIQ Tables
-- These policies ensure users can only access data for buildings they have access to

-- Enable RLS on tables
ALTER TABLE building_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE incoming_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_events ENABLE ROW LEVEL SECURITY;

-- ✅ Policy for 'building_todos' table
CREATE POLICY "Users can read todos for buildings they can access"
  ON public.building_todos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM building_members
      WHERE building_members.building_id = building_todos.building_id
      AND building_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert todos for buildings they can access"
  ON public.building_todos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM building_members
      WHERE building_members.building_id = building_todos.building_id
      AND building_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update todos for buildings they can access"
  ON public.building_todos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM building_members
      WHERE building_members.building_id = building_todos.building_id
      AND building_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete todos for buildings they can access"
  ON public.building_todos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM building_members
      WHERE building_members.building_id = building_todos.building_id
      AND building_members.user_id = auth.uid()
    )
  );

-- ✅ Policy for 'incoming_emails' table
CREATE POLICY "Users can read emails for buildings they can access"
  ON public.incoming_emails
  FOR SELECT
  USING (
    building_id IS NULL OR
    EXISTS (
      SELECT 1 FROM building_members
      WHERE building_members.building_id = incoming_emails.building_id
      AND building_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update emails for buildings they can access"
  ON public.incoming_emails
  FOR UPDATE
  USING (
    building_id IS NULL OR
    EXISTS (
      SELECT 1 FROM building_members
      WHERE building_members.building_id = incoming_emails.building_id
      AND building_members.user_id = auth.uid()
    )
  );

-- ✅ Policy for 'property_events' table
CREATE POLICY "Users can read events for buildings they can access"
  ON public.property_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM building_members
      WHERE building_members.building_id = property_events.building_id
      AND building_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert events for buildings they can access"
  ON public.property_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM building_members
      WHERE building_members.building_id = property_events.building_id
      AND building_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update events for buildings they can access"
  ON public.property_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM building_members
      WHERE building_members.building_id = property_events.building_id
      AND building_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete events for buildings they can access"
  ON public.property_events
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM building_members
      WHERE building_members.building_id = property_events.building_id
      AND building_members.user_id = auth.uid()
    )
  );

-- ✅ Policy for 'building_members' table (if it doesn't exist)
-- This table should store which users have access to which buildings
CREATE TABLE IF NOT EXISTS building_members (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, building_id)
);

ALTER TABLE building_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own building memberships"
  ON public.building_members
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own building memberships"
  ON public.building_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON building_todos TO authenticated;
GRANT ALL ON incoming_emails TO authenticated;
GRANT ALL ON property_events TO authenticated;
GRANT ALL ON building_members TO authenticated; 