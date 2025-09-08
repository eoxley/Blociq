-- Fix incoming_emails RLS policies to show ALL emails for authenticated users
-- This ensures users can see all their emails regardless of building association

BEGIN;

-- Drop all existing policies on incoming_emails
DROP POLICY IF EXISTS "Users can view emails for their agency buildings" ON public.incoming_emails;
DROP POLICY IF EXISTS "Users can update emails for their agency buildings" ON public.incoming_emails;
DROP POLICY IF EXISTS "Users can insert emails for their agency buildings" ON public.incoming_emails;
DROP POLICY IF EXISTS "Users can view emails for buildings they can access" ON public.incoming_emails;
DROP POLICY IF EXISTS "Users can update emails for buildings they can access" ON public.incoming_emails;
DROP POLICY IF EXISTS "Users can read emails for buildings they can access" ON public.incoming_emails;
DROP POLICY IF EXISTS "Users can update emails for buildings they can access" ON public.incoming_emails;
DROP POLICY IF EXISTS "Logged users can read all emails" ON public.incoming_emails;
DROP POLICY IF EXISTS "Logged users can update their own emails" ON public.incoming_emails;
DROP POLICY IF EXISTS "Logged users can insert emails" ON public.incoming_emails;
DROP POLICY IF EXISTS "Users can view own emails" ON public.incoming_emails;
DROP POLICY IF EXISTS "Users can update own emails" ON public.incoming_emails;
DROP POLICY IF EXISTS "Users can insert own emails" ON public.incoming_emails;
DROP POLICY IF EXISTS "Users can delete own emails" ON public.incoming_emails;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.incoming_emails;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.incoming_emails;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.incoming_emails;

-- Create simple, permissive policies for incoming_emails
-- Users can see ALL emails (not just building-specific ones)
CREATE POLICY "Authenticated users can read all emails"
ON public.incoming_emails
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update all emails"
ON public.incoming_emails
FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert emails"
ON public.incoming_emails
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete emails"
ON public.incoming_emails
FOR DELETE
USING (auth.role() = 'authenticated');

-- Ensure RLS is enabled
ALTER TABLE public.incoming_emails ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incoming_emails TO authenticated;

-- Log success
DO $$
BEGIN
    RAISE NOTICE '✅ Fixed incoming_emails RLS policies';
    RAISE NOTICE '✅ All authenticated users can now see ALL emails';
    RAISE NOTICE '✅ Dashboard should now show correct email counts';
END $$;

COMMIT;
