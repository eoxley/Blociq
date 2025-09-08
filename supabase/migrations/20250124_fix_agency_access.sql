-- Fix agency access issues
-- This migration ensures users can access their agency data

-- First, let's check if the user has any agency memberships
-- If not, we'll create a default agency and assign them to it

-- Create a function to ensure user has agency access
CREATE OR REPLACE FUNCTION ensure_user_agency_access(user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  agency_id uuid;
  existing_membership_count integer;
BEGIN
  -- Check if user already has agency memberships
  SELECT COUNT(*) INTO existing_membership_count
  FROM public.agency_members
  WHERE agency_members.user_id = ensure_user_agency_access.user_id
    AND invitation_status = 'accepted';
  
  -- If user has memberships, return the first one
  IF existing_membership_count > 0 THEN
    SELECT am.agency_id INTO agency_id
    FROM public.agency_members am
    WHERE am.user_id = ensure_user_agency_access.user_id
      AND am.invitation_status = 'accepted'
    ORDER BY am.joined_at ASC
    LIMIT 1;
    
    RETURN agency_id;
  END IF;
  
  -- Check if there's a default agency
  SELECT id INTO agency_id
  FROM public.agencies
  WHERE slug = 'default'
  LIMIT 1;
  
  -- If no default agency exists, create one
  IF agency_id IS NULL THEN
    INSERT INTO public.agencies (name, slug, status)
    VALUES ('Default Agency', 'default', 'active')
    RETURNING id INTO agency_id;
  END IF;
  
  -- Add user to the agency
  INSERT INTO public.agency_members (agency_id, user_id, role, invitation_status)
  VALUES (agency_id, ensure_user_agency_access.user_id, 'owner', 'accepted')
  ON CONFLICT (agency_id, user_id) DO UPDATE SET
    invitation_status = 'accepted',
    role = 'owner';
  
  RETURN agency_id;
END;
$$;

-- Create a function to get user's accessible agencies
CREATE OR REPLACE FUNCTION get_user_accessible_agencies(user_id uuid)
RETURNS TABLE (
  agency_id uuid,
  agency_name text,
  agency_slug text,
  user_role text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    am.agency_id,
    a.name as agency_name,
    a.slug as agency_slug,
    am.role::text as user_role
  FROM public.agency_members am
  JOIN public.agencies a ON a.id = am.agency_id
  WHERE am.user_id = get_user_accessible_agencies.user_id
    AND am.invitation_status = 'accepted'
  ORDER BY am.joined_at ASC;
$$;

-- Update RLS policies to be more permissive for authenticated users
DROP POLICY IF EXISTS "agencies: select own" ON public.agencies;
CREATE POLICY "agencies: select own"
ON public.agencies
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.agency_id = agencies.id
      AND am.user_id = auth.uid()
      AND am.invitation_status = 'accepted'
  )
);

-- Update agency_members policy to be more permissive
DROP POLICY IF EXISTS "agency_members: select self-agency" ON public.agency_members;
CREATE POLICY "agency_members: select self-agency"
ON public.agency_members
FOR SELECT USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.agency_members am2
    WHERE am2.agency_id = agency_members.agency_id
      AND am2.user_id = auth.uid()
      AND am2.invitation_status = 'accepted'
  )
);

-- Ensure buildings are accessible to users in the same agency
DROP POLICY IF EXISTS "buildings: select own agency" ON public.buildings;
CREATE POLICY "buildings: select own agency"
ON public.buildings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.agency_id = buildings.agency_id
      AND am.user_id = auth.uid()
      AND am.invitation_status = 'accepted'
  )
);

-- Add a comment explaining the fix
COMMENT ON FUNCTION ensure_user_agency_access(uuid) IS 'Ensures user has access to at least one agency, creating default if needed';
COMMENT ON FUNCTION get_user_accessible_agencies(uuid) IS 'Returns all agencies accessible to a user';
