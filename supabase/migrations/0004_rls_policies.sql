-- ========================================
-- MULTI-AGENCY SETUP: RLS POLICIES
-- Migration: 0004_rls_policies.sql
-- Description: Enable RLS and create agency-scoped policies
-- ========================================

-- Enable RLS on agencies and agency_members tables
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;

-- ========================================
-- AGENCIES TABLE POLICIES
-- ========================================

-- Agencies: members can read their own agency
DROP POLICY IF EXISTS "agencies: select own" ON public.agencies;
CREATE POLICY "agencies: select own"
ON public.agencies
FOR SELECT USING (public.is_member_of_agency(id));

-- Agencies: admin+ can modify
DROP POLICY IF EXISTS "agencies: upsert by admin" ON public.agencies;
CREATE POLICY "agencies: upsert by admin"
ON public.agencies
FOR ALL USING (
  public.is_member_of_agency(id)
  AND EXISTS (
    SELECT 1 FROM public.agency_members m
    WHERE m.agency_id = agencies.id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  )
) WITH CHECK (public.is_member_of_agency(id));

-- ========================================
-- AGENCY_MEMBERS TABLE POLICIES
-- ========================================

-- agency_members: users see their memberships and members of their agencies
DROP POLICY IF EXISTS "agency_members: select self-agency" ON public.agency_members;
CREATE POLICY "agency_members: select self-agency"
ON public.agency_members
FOR SELECT USING (
  user_id = auth.uid() 
  OR public.is_member_of_agency(agency_id)
);

-- agency_members: admin+ can manage memberships
DROP POLICY IF EXISTS "agency_members: manage by admin" ON public.agency_members;
CREATE POLICY "agency_members: manage by admin"
ON public.agency_members
FOR ALL USING (
  public.is_member_of_agency(agency_id)
  AND EXISTS (
    SELECT 1 FROM public.agency_members m
    WHERE m.agency_id = agency_members.agency_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  )
) WITH CHECK (public.is_member_of_agency(agency_id));

-- ========================================
-- ENABLE RLS ON DOMAIN TABLES
-- ========================================

-- Enable RLS on all domain tables that exist
DO $$
DECLARE
  table_name text;
  domain_tables text[] := ARRAY[
    'buildings', 'units', 'leaseholders', 'building_documents', 'incoming_emails',
    'building_compliance_assets', 'compliance_assets', 'ai_logs', 'email_history',
    'sent_emails', 'building_setup', 'leases', 'contractors', 'compliance_inspections',
    'building_compliance_config', 'compliance_notifications', 'property_events',
    'calendar_events', 'works_orders'
  ];
BEGIN
  FOREACH table_name IN ARRAY domain_tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = table_name) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      RAISE NOTICE 'Enabled RLS on %', table_name;
    END IF;
  END LOOP;
END$$;

-- ========================================
-- CREATE SELECT POLICIES (READ ACCESS)
-- ========================================

-- Function to create select policy for a table
CREATE OR REPLACE FUNCTION create_agency_select_policy(table_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Drop existing policy if it exists
  BEGIN
    EXECUTE format('DROP POLICY IF EXISTS "%s: select own agency" ON public.%I', table_name, table_name);
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if policy doesn't exist
  END;
  
  -- Create new select policy
  EXECUTE format($fmt$
    CREATE POLICY "%s: select own agency"
    ON public.%I
    FOR SELECT USING (public.is_member_of_agency(agency_id))
  $fmt$, table_name, table_name);
  
  RAISE NOTICE 'Created select policy for %', table_name;
END;
$$;

-- Apply select policies to all domain tables
DO $$
DECLARE
  table_name text;
  domain_tables text[] := ARRAY[
    'buildings', 'units', 'leaseholders', 'building_documents', 'incoming_emails',
    'building_compliance_assets', 'compliance_assets', 'ai_logs', 'email_history',
    'sent_emails', 'building_setup', 'leases', 'contractors', 'compliance_inspections',
    'building_compliance_config', 'compliance_notifications', 'property_events',
    'calendar_events', 'works_orders'
  ];
BEGIN
  FOREACH table_name IN ARRAY domain_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema='public' AND table_name = table_name
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name = table_name AND column_name='agency_id'
    ) THEN
      PERFORM create_agency_select_policy(table_name);
    END IF;
  END LOOP;
END$$;

-- ========================================
-- CREATE MODIFY POLICIES (WRITE ACCESS - MANAGER+)
-- ========================================

-- Function to create modify policy for a table
CREATE OR REPLACE FUNCTION create_agency_modify_policy(table_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Drop existing policy if it exists
  BEGIN
    EXECUTE format('DROP POLICY IF EXISTS "%s: modify by manager+" ON public.%I', table_name, table_name);
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if policy doesn't exist
  END;
  
  -- Create new modify policy
  EXECUTE format($fmt$
    CREATE POLICY "%s: modify by manager+"
    ON public.%I
    FOR ALL USING (
      public.is_member_of_agency(agency_id)
      AND EXISTS (
        SELECT 1 FROM public.agency_members m
        WHERE m.agency_id = %I.agency_id
          AND m.user_id = auth.uid()
          AND m.role IN ('owner','admin','manager')
      )
    ) WITH CHECK (public.is_member_of_agency(agency_id))
  $fmt$, table_name, table_name, table_name);
  
  RAISE NOTICE 'Created modify policy for %', table_name;
END;
$$;

-- Apply modify policies to all domain tables
DO $$
DECLARE
  table_name text;
  domain_tables text[] := ARRAY[
    'buildings', 'units', 'leaseholders', 'building_documents', 'incoming_emails',
    'building_compliance_assets', 'compliance_assets', 'ai_logs', 'email_history',
    'sent_emails', 'building_setup', 'leases', 'contractors', 'compliance_inspections',
    'building_compliance_config', 'compliance_notifications', 'property_events',
    'calendar_events', 'works_orders'
  ];
BEGIN
  FOREACH table_name IN ARRAY domain_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema='public' AND table_name = table_name
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name = table_name AND column_name='agency_id'
    ) THEN
      PERFORM create_agency_modify_policy(table_name);
    END IF;
  END LOOP;
END$$;

-- ========================================
-- SPECIAL CASE POLICIES
-- ========================================

-- compliance_templates: readable by all authenticated users (they're templates)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='compliance_templates') THEN
    ALTER TABLE public.compliance_templates ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "compliance_templates: readable by all" ON public.compliance_templates;
    CREATE POLICY "compliance_templates: readable by all" 
    ON public.compliance_templates
    FOR SELECT TO authenticated USING (true);
    RAISE NOTICE 'Created special policy for compliance_templates';
  END IF;
END$$;

-- users table: users can read their own profile and profiles in their agencies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "users: select own and agency" ON public.users;
    CREATE POLICY "users: select own and agency"
    ON public.users
    FOR SELECT USING (
      id = auth.uid()
      OR (agency_id IS NOT NULL AND public.is_member_of_agency(agency_id))
    );
    
    DROP POLICY IF EXISTS "users: modify own" ON public.users;
    CREATE POLICY "users: modify own"
    ON public.users
    FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());
    RAISE NOTICE 'Created special policies for users';
  END IF;
END$$;

-- profiles table: similar to users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "profiles: select own and agency" ON public.profiles;
    CREATE POLICY "profiles: select own and agency"
    ON public.profiles
    FOR SELECT USING (
      user_id = auth.uid()
      OR (agency_id IS NOT NULL AND public.is_member_of_agency(agency_id))
    );
    
    DROP POLICY IF EXISTS "profiles: modify own" ON public.profiles;
    CREATE POLICY "profiles: modify own"
    ON public.profiles
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    RAISE NOTICE 'Created special policies for profiles';
  END IF;
END$$;

-- ========================================
-- CLEANUP AND VERIFICATION
-- ========================================

-- Drop helper functions
DROP FUNCTION IF EXISTS create_agency_select_policy(text);
DROP FUNCTION IF EXISTS create_agency_modify_policy(text);

-- Verification function
CREATE OR REPLACE FUNCTION verify_agency_rls()
RETURNS TABLE (
  table_name text,
  rls_enabled boolean,
  has_agency_id boolean,
  policy_count bigint
)
LANGUAGE sql
AS $$
  SELECT 
    t.table_name::text,
    COALESCE(c.relrowsecurity, false) as rls_enabled,
    EXISTS (
      SELECT 1 FROM information_schema.columns col
      WHERE col.table_schema = 'public' 
        AND col.table_name = t.table_name 
        AND col.column_name = 'agency_id'
    ) as has_agency_id,
    COALESCE(p.policy_count, 0) as policy_count
  FROM information_schema.tables t
  LEFT JOIN pg_class c ON c.relname = t.table_name AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LEFT JOIN (
    SELECT 
      schemaname||'.'||tablename as full_table_name,
      COUNT(*) as policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    GROUP BY schemaname||'.'||tablename
  ) p ON p.full_table_name = 'public.' || t.table_name
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name IN (
      'agencies', 'agency_members', 'buildings', 'units', 'leaseholders', 
      'building_documents', 'incoming_emails', 'building_compliance_assets',
      'compliance_assets', 'ai_logs', 'email_history', 'sent_emails',
      'building_setup', 'leases', 'contractors', 'compliance_inspections',
      'building_compliance_config', 'compliance_notifications', 'property_events',
      'calendar_events', 'works_orders', 'users', 'profiles', 'compliance_templates'
    )
  ORDER BY t.table_name;
$$;

-- Run verification
DO $$
DECLARE
  rec record;
  total_tables int := 0;
  rls_enabled_count int := 0;
  agency_scoped_count int := 0;
BEGIN
  RAISE NOTICE 'Agency RLS Verification Report:';
  RAISE NOTICE '================================';
  
  FOR rec IN SELECT * FROM verify_agency_rls()
  LOOP
    total_tables := total_tables + 1;
    
    IF rec.rls_enabled THEN
      rls_enabled_count := rls_enabled_count + 1;
    END IF;
    
    IF rec.has_agency_id AND rec.rls_enabled THEN
      agency_scoped_count := agency_scoped_count + 1;
    END IF;
    
    RAISE NOTICE 'Table: % | RLS: % | Agency ID: % | Policies: %', 
      rec.table_name, rec.rls_enabled, rec.has_agency_id, rec.policy_count;
  END LOOP;
  
  RAISE NOTICE '================================';
  RAISE NOTICE 'Summary: % total tables, % with RLS, % agency-scoped', 
    total_tables, rls_enabled_count, agency_scoped_count;
END$$;

-- Drop verification function
DROP FUNCTION verify_agency_rls();

-- Add comments
COMMENT ON FUNCTION public.is_member_of_agency(uuid) IS 'RLS helper: Check if current user is member of specified agency';
COMMENT ON FUNCTION public.is_agency_manager_or_above(uuid) IS 'RLS helper: Check if current user has manager+ permissions in agency';
