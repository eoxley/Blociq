-- ✅ FIX RLS FOR INBOX + DASHBOARD
-- Applies row-level security policies to unlock lease jobs, users, and Outlook tokens

BEGIN;

-- ========================================
-- 1. ENABLE RLS ON CRITICAL TABLES
-- ========================================

-- Ensure RLS is enabled on all critical tables
ALTER TABLE public.lease_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlook_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. DROP EXISTING POLICIES (if any)
-- ========================================

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view lease jobs for their agency buildings" ON public.lease_processing_jobs;
DROP POLICY IF EXISTS "Users can view their own tokens" ON public.outlook_tokens;
DROP POLICY IF EXISTS "Users can view users in their agency" ON public.users;

-- ========================================
-- 3. CREATE FOCUSED RLS POLICIES
-- ========================================

-- 🔓 Allow reading lease processing jobs for buildings in user's agency
CREATE POLICY "View lease jobs if user has access to building"
ON public.lease_processing_jobs
FOR SELECT
USING (
  building_id IN (
    SELECT id FROM public.buildings
    WHERE agency_id = (
      current_setting('request.jwt.claims', true)::json->>'agency_id'
    )::uuid
  )
);

-- 🔓 Allow user to view their own Outlook token
CREATE POLICY "View own Outlook tokens"
ON public.outlook_tokens
FOR SELECT
USING (
  user_id = (
    current_setting('request.jwt.claims', true)::json->>'sub'
  )::uuid
);

-- 🔓 Allow users to see other users in their agency (for e.g. dashboard tools)
CREATE POLICY "View users in your agency"
ON public.users
FOR SELECT
USING (
  agency_id = (
    current_setting('request.jwt.claims', true)::json->>'agency_id'
  )::uuid
);

-- ========================================
-- 4. ADD SUPPORTING POLICIES FOR COMPLETE FUNCTIONALITY
-- ========================================

-- Allow users to update their own lease jobs (for status updates)
CREATE POLICY "Update own lease jobs"
ON public.lease_processing_jobs
FOR UPDATE
USING (
  building_id IN (
    SELECT id FROM public.buildings
    WHERE agency_id = (
      current_setting('request.jwt.claims', true)::json->>'agency_id'
    )::uuid
  )
);

-- Allow users to insert new lease jobs
CREATE POLICY "Insert lease jobs for agency buildings"
ON public.lease_processing_jobs
FOR INSERT
WITH CHECK (
  building_id IN (
    SELECT id FROM public.buildings
    WHERE agency_id = (
      current_setting('request.jwt.claims', true)::json->>'agency_id'
    )::uuid
  )
);

-- Allow users to update their own Outlook tokens
CREATE POLICY "Update own Outlook tokens"
ON public.outlook_tokens
FOR UPDATE
USING (
  user_id = (
    current_setting('request.jwt.claims', true)::json->>'sub'
  )::uuid
);

-- Allow users to insert their own Outlook tokens
CREATE POLICY "Insert own Outlook tokens"
ON public.outlook_tokens
FOR INSERT
WITH CHECK (
  user_id = (
    current_setting('request.jwt.claims', true)::json->>'sub'
  )::uuid
);

-- Allow users to update other users in their agency
CREATE POLICY "Update users in your agency"
ON public.users
FOR UPDATE
USING (
  agency_id = (
    current_setting('request.jwt.claims', true)::json->>'agency_id'
  )::uuid
);

-- Allow users to insert new users in their agency
CREATE POLICY "Insert users in your agency"
ON public.users
FOR INSERT
WITH CHECK (
  agency_id = (
    current_setting('request.jwt.claims', true)::json->>'agency_id'
  )::uuid
);

-- ========================================
-- 5. GRANT NECESSARY PERMISSIONS
-- ========================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.lease_processing_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.outlook_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- ========================================
-- 6. CREATE PERFORMANCE INDEXES
-- ========================================

-- Create indexes to improve RLS policy performance
CREATE INDEX IF NOT EXISTS idx_lease_processing_jobs_building_id ON public.lease_processing_jobs(building_id);
CREATE INDEX IF NOT EXISTS idx_outlook_tokens_user_id ON public.outlook_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_users_agency_id ON public.users(agency_id);
CREATE INDEX IF NOT EXISTS idx_buildings_agency_id ON public.buildings(agency_id);

-- ========================================
-- 7. LOG SUCCESS
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '✅ Inbox & Dashboard RLS policies created successfully';
    RAISE NOTICE '✅ lease_processing_jobs: Agency-scoped access via building_id';
    RAISE NOTICE '✅ outlook_tokens: User-scoped access via user_id';
    RAISE NOTICE '✅ users: Agency-scoped access via agency_id';
    RAISE NOTICE '✅ Performance indexes created for optimal query speed';
    RAISE NOTICE '✅ API endpoints should now work without 401/406/500 errors';
END $$;

COMMIT;
