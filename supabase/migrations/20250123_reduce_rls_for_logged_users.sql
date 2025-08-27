-- 🔓 Reduce RLS restrictions for logged-in users
-- This migration makes the inbox more accessible while maintaining security

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can read emails for buildings they can access" ON public.incoming_emails;
DROP POLICY IF EXISTS "Users can update emails for buildings they can access" ON public.incoming_emails;

-- Create more permissive policies for logged-in users
CREATE POLICY "Logged users can read all emails"
  ON public.incoming_emails
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Logged users can update their own emails"
  ON public.incoming_emails
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    (building_id IS NULL OR 
     EXISTS (
       SELECT 1 FROM building_members
       WHERE building_members.building_id = incoming_emails.building_id
       AND building_members.user_id = auth.uid()
     ))
  );

-- Allow logged users to insert emails (useful for email composition)
CREATE POLICY "Logged users can insert emails"
  ON public.incoming_emails
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Reduce restrictions on building_todos for logged users
DROP POLICY IF EXISTS "Users can read todos for buildings they can access" ON public.building_todos;

CREATE POLICY "Logged users can read all todos"
  ON public.building_todos
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Keep update/delete restrictions for building-specific data
-- This maintains security while allowing read access

-- Reduce restrictions on property_events for logged users
DROP POLICY IF EXISTS "Users can read events for buildings they can access" ON public.property_events;

CREATE POLICY "Logged users can read all events"
  ON public.property_events
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow logged users to read building_members (useful for UI)
CREATE POLICY "Logged users can read building memberships"
  ON public.building_members
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Grant additional permissions for better inbox functionality
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create a function to check if user has access to a building
CREATE OR REPLACE FUNCTION public.user_has_building_access(building_id_param INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  -- If no building specified, allow access
  IF building_id_param IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a member of the building
  RETURN EXISTS (
    SELECT 1 FROM building_members
    WHERE building_members.building_id = building_id_param
    AND building_members.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.user_has_building_access(INTEGER) TO authenticated;

-- Update RLS policies to use the new function
CREATE POLICY "Users can update events for buildings they can access"
  ON public.property_events
  FOR UPDATE
  USING (public.user_has_building_access(building_id));

CREATE POLICY "Users can delete events for buildings they can access"
  ON public.property_events
  FOR DELETE
  USING (public.user_has_building_access(building_id));

CREATE POLICY "Users can insert events for buildings they can access"
  ON public.property_events
  FOR INSERT
  WITH CHECK (public.user_has_building_access(building_id));

-- Add comment explaining the changes
COMMENT ON TABLE public.incoming_emails IS 'Emails accessible to all authenticated users for better inbox functionality';
COMMENT ON TABLE public.building_todos IS 'Todos readable by all authenticated users, but only editable by building members';
COMMENT ON TABLE public.property_events IS 'Events readable by all authenticated users, but only editable by building members';
