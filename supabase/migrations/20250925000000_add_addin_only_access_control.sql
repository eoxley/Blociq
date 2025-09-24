-- ========================================
-- ADD-IN ONLY ACCESS CONTROL SYSTEM
-- Migration: 20250925000000_add_addin_only_access_control.sql
-- Description: Add addin_only flag and enhanced RLS policies to protect agency data
-- ========================================

-- Add addin_only flag to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS addin_only BOOLEAN DEFAULT false;

-- Add addin_only flag to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS addin_only BOOLEAN DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_addin_only ON public.users(addin_only) WHERE addin_only = true;
CREATE INDEX IF NOT EXISTS idx_profiles_addin_only ON public.profiles(addin_only) WHERE addin_only = true;

-- ========================================
-- CREATE HELPER FUNCTION FOR ADD-IN CHECKS
-- ========================================

-- Function to check if current user is add-in only
CREATE OR REPLACE FUNCTION public.is_addin_only_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT addin_only FROM public.users WHERE id = auth.uid()),
    (SELECT addin_only FROM public.profiles WHERE user_id = auth.uid()),
    false
  );
$$;

-- Function to check if user has agency access (not add-in only)
CREATE OR REPLACE FUNCTION public.has_agency_access(target_agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    NOT public.is_addin_only_user()
    AND public.is_member_of_agency(target_agency_id);
$$;

-- ========================================
-- UPDATE RLS POLICIES FOR SENSITIVE TABLES
-- ========================================

-- Function to update a table's RLS policy to block add-in users
CREATE OR REPLACE FUNCTION update_agency_policy_with_addin_block(table_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update SELECT policy to block add-in users
  BEGIN
    EXECUTE format('DROP POLICY IF EXISTS "%s: select own agency" ON public.%I', table_name, table_name);
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if policy doesn't exist
  END;

  EXECUTE format($fmt$
    CREATE POLICY "%s: select own agency"
    ON public.%I
    FOR SELECT USING (public.has_agency_access(agency_id))
  $fmt$, table_name, table_name);

  -- Update MODIFY policy to block add-in users
  BEGIN
    EXECUTE format('DROP POLICY IF EXISTS "%s: modify by manager+" ON public.%I', table_name, table_name);
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if policy doesn't exist
  END;

  EXECUTE format($fmt$
    CREATE POLICY "%s: modify by manager+"
    ON public.%I
    FOR ALL USING (
      public.has_agency_access(agency_id)
      AND EXISTS (
        SELECT 1 FROM public.agency_members m
        WHERE m.agency_id = %I.agency_id
          AND m.user_id = auth.uid()
          AND m.role IN ('owner','admin','manager')
      )
    ) WITH CHECK (public.has_agency_access(agency_id))
  $fmt$, table_name, table_name, table_name);

  RAISE NOTICE 'Updated RLS policies for % to block add-in users', table_name;
END;
$$;

-- Apply enhanced policies to all sensitive tables
DO $$
DECLARE
  table_name text;
  sensitive_tables text[] := ARRAY[
    'buildings', 'units', 'leaseholders', 'building_documents', 'incoming_emails',
    'building_compliance_assets', 'compliance_assets', 'ai_logs', 'email_history',
    'sent_emails', 'building_setup', 'leases', 'contractors', 'compliance_inspections',
    'building_compliance_config', 'compliance_notifications', 'property_events',
    'calendar_events', 'works_orders', 'building_action_tracker', 'communications_log'
  ];
BEGIN
  FOREACH table_name IN ARRAY sensitive_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name = table_name
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name = table_name AND column_name='agency_id'
    ) THEN
      PERFORM update_agency_policy_with_addin_block(table_name);
    END IF;
  END LOOP;
END$$;

-- ========================================
-- SPECIAL POLICIES FOR USER TABLES
-- ========================================

-- Update users table policy
DROP POLICY IF EXISTS "users: select own and agency" ON public.users;
CREATE POLICY "users: select own and agency"
ON public.users
FOR SELECT USING (
  id = auth.uid()
  OR (
    agency_id IS NOT NULL
    AND NOT public.is_addin_only_user()
    AND public.is_member_of_agency(agency_id)
  )
);

-- Update profiles table policy
DROP POLICY IF EXISTS "profiles: select own and agency" ON public.profiles;
CREATE POLICY "profiles: select own and agency"
ON public.profiles
FOR SELECT USING (
  user_id = auth.uid()
  OR (
    agency_id IS NOT NULL
    AND NOT public.is_addin_only_user()
    AND public.is_member_of_agency(agency_id)
  )
);

-- ========================================
-- AI ENDPOINTS ACCESS POLICIES
-- ========================================

-- Create table for AI endpoint access logs (if not exists)
CREATE TABLE IF NOT EXISTS public.ai_endpoint_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  is_addin_user BOOLEAN DEFAULT false,
  agency_access BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on AI logs
ALTER TABLE public.ai_endpoint_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own AI logs
CREATE POLICY "ai_endpoint_logs: own logs"
ON public.ai_endpoint_logs
FOR SELECT USING (user_id = auth.uid());

-- Policy: All authenticated users can insert (for logging)
CREATE POLICY "ai_endpoint_logs: insert own"
ON public.ai_endpoint_logs
FOR INSERT WITH CHECK (user_id = auth.uid());

-- ========================================
-- VERIFICATION AND TESTING HELPERS
-- ========================================

-- Function to test user access
CREATE OR REPLACE FUNCTION public.test_user_access(test_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  email text,
  is_addin_only boolean,
  agency_id uuid,
  has_agency_membership boolean,
  can_access_buildings boolean,
  test_summary text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH user_info AS (
    SELECT
      COALESCE(test_user_id, auth.uid()) as uid,
      u.email,
      COALESCE(u.addin_only, p.addin_only, false) as addin_only,
      COALESCE(u.agency_id, p.agency_id) as user_agency_id
    FROM auth.users au
    LEFT JOIN public.users u ON u.id = au.id
    LEFT JOIN public.profiles p ON p.user_id = au.id
    WHERE au.id = COALESCE(test_user_id, auth.uid())
  )
  SELECT
    ui.uid,
    ui.email,
    ui.addin_only,
    ui.user_agency_id,
    (ui.user_agency_id IS NOT NULL) as has_agency_membership,
    (
      ui.user_agency_id IS NOT NULL
      AND NOT ui.addin_only
    ) as can_access_buildings,
    CASE
      WHEN ui.addin_only THEN 'ADD-IN ONLY: Can use AI endpoints but cannot access agency data'
      WHEN ui.user_agency_id IS NOT NULL THEN 'FULL ACCESS: Can access agency data and AI endpoints'
      ELSE 'NO ACCESS: No agency membership, limited functionality'
    END as test_summary
  FROM user_info ui;
$$;

-- Create test add-in user function
CREATE OR REPLACE FUNCTION public.create_test_addin_user(test_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create user in auth.users (this would normally be done by Supabase Auth)
  INSERT INTO auth.users (email, email_confirmed_at, created_at, updated_at)
  VALUES (test_email, NOW(), NOW(), NOW())
  RETURNING id INTO new_user_id;

  -- Create profile with addin_only flag
  INSERT INTO public.profiles (user_id, full_name, role, addin_only, created_at, updated_at)
  VALUES (new_user_id, 'Test Add-in User', 'addin_user', true, NOW(), NOW());

  -- Also create users record for compatibility
  INSERT INTO public.users (id, email, full_name, role, addin_only, created_at, updated_at)
  VALUES (new_user_id, test_email, 'Test Add-in User', 'addin_user', true, NOW(), NOW());

  RETURN new_user_id;
END;
$$;

-- ========================================
-- CLEANUP AND SECURITY
-- ========================================

-- Drop helper function
DROP FUNCTION IF EXISTS update_agency_policy_with_addin_block(text);

-- Add comments for documentation
COMMENT ON FUNCTION public.is_addin_only_user() IS 'Check if current authenticated user is add-in only (blocked from agency data)';
COMMENT ON FUNCTION public.has_agency_access(uuid) IS 'Check if current user can access agency data (not add-in only AND member of agency)';
COMMENT ON FUNCTION public.test_user_access(uuid) IS 'Test access levels for debugging - returns user permissions summary';
COMMENT ON FUNCTION public.create_test_addin_user(text) IS 'Create test user with addin_only=true for testing access control';

-- Add table comments
COMMENT ON COLUMN public.users.addin_only IS 'If true, user can only access AI endpoints, not agency data';
COMMENT ON COLUMN public.profiles.addin_only IS 'If true, user can only access AI endpoints, not agency data';
COMMENT ON TABLE public.ai_endpoint_logs IS 'Logs AI endpoint access for monitoring add-in vs full user usage';

-- ========================================
-- VERIFICATION REPORT
-- ========================================

DO $$
DECLARE
  rec record;
  policy_count int := 0;
  addin_protected_count int := 0;
BEGIN
  RAISE NOTICE 'Add-in Access Control Implementation Report:';
  RAISE NOTICE '=============================================';

  -- Count policies that mention addin checks
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (definition LIKE '%has_agency_access%' OR definition LIKE '%is_addin_only%');

  RAISE NOTICE 'Enhanced RLS policies with add-in protection: %', policy_count;

  -- Test helper functions
  BEGIN
    IF public.is_addin_only_user() IS NOT NULL THEN
      RAISE NOTICE '✓ is_addin_only_user() function working';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ is_addin_only_user() function failed: %', SQLERRM;
  END;

  RAISE NOTICE '=============================================';
  RAISE NOTICE 'Implementation Summary:';
  RAISE NOTICE '- Added addin_only column to users and profiles tables';
  RAISE NOTICE '- Created helper functions for access control';
  RAISE NOTICE '- Enhanced % RLS policies to block add-in users from agency data', policy_count;
  RAISE NOTICE '- Added AI endpoint logging capabilities';
  RAISE NOTICE '- Created testing and verification functions';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Test with: SELECT * FROM public.test_user_access();';
  RAISE NOTICE '2. Create test user: SELECT public.create_test_addin_user(''test@example.com'');';
  RAISE NOTICE '3. Verify API endpoints respect addin_only flag';
END$$;