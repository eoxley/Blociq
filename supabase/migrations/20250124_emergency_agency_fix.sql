-- Emergency fix for agency access issues
-- This temporarily disables RLS to create necessary data

-- Temporarily disable RLS on agencies table
ALTER TABLE public.agencies DISABLE ROW LEVEL SECURITY;

-- Create a default agency if it doesn't exist
INSERT INTO public.agencies (name, slug, status)
VALUES ('Default Agency', 'default', 'active')
ON CONFLICT (slug) DO NOTHING;

-- Get the default agency ID
DO $$
DECLARE
  default_agency_id uuid;
  user_id uuid;
BEGIN
  -- Get the default agency ID
  SELECT id INTO default_agency_id
  FROM public.agencies
  WHERE slug = 'default'
  LIMIT 1;
  
  -- Add all users to the default agency
  FOR user_id IN SELECT id FROM auth.users
  LOOP
    INSERT INTO public.agency_members (agency_id, user_id, role, invitation_status)
    VALUES (default_agency_id, user_id, 'owner', 'accepted')
    ON CONFLICT (agency_id, user_id) DO UPDATE SET
      invitation_status = 'accepted',
      role = 'owner';
  END LOOP;
  
  RAISE NOTICE 'Added all users to default agency: %', default_agency_id;
END $$;

-- Re-enable RLS on agencies table
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Create a more permissive policy for agencies
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

-- Create a policy for agencies to allow users to see agencies they're members of
DROP POLICY IF EXISTS "agencies: select member agencies" ON public.agencies;
CREATE POLICY "agencies: select member agencies"
ON public.agencies
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.agency_id = agencies.id
      AND am.user_id = auth.uid()
      AND am.invitation_status = 'accepted'
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

-- Add a comment
COMMENT ON TABLE public.agencies IS 'Property management agencies - emergency fix applied';
