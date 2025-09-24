-- ========================================
-- RLS POLICY VERIFICATION SCRIPT
-- File: scripts/verify-rls-policies.sql
-- Description: Verify current RLS policies and access control implementation
-- ========================================

-- Function to get current RLS policy status
CREATE OR REPLACE FUNCTION verify_current_rls_policies()
RETURNS TABLE (
  table_name text,
  rls_enabled boolean,
  has_agency_id boolean,
  has_addin_protection boolean,
  policy_count bigint,
  policy_details text[]
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
    EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = t.table_name
        AND (p.definition LIKE '%has_agency_access%' OR p.definition LIKE '%is_addin_only%')
    ) as has_addin_protection,
    COALESCE(pol.policy_count, 0) as policy_count,
    COALESCE(pol.policy_names, ARRAY[]::text[]) as policy_details
  FROM information_schema.tables t
  LEFT JOIN pg_class c ON c.relname = t.table_name AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LEFT JOIN (
    SELECT
      tablename,
      COUNT(*) as policy_count,
      array_agg(policyname) as policy_names
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
  ) pol ON pol.tablename = t.table_name
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name IN (
      'buildings', 'units', 'leaseholders', 'building_documents', 'incoming_emails',
      'building_compliance_assets', 'compliance_assets', 'building_setup',
      'communications_log', 'building_action_tracker', 'users', 'profiles'
    )
  ORDER BY t.table_name;
$$;

-- Function to check add-in user capabilities
CREATE OR REPLACE FUNCTION check_addin_user_access()
RETURNS TABLE (
  check_name text,
  status text,
  details text
)
LANGUAGE sql
AS $$
  SELECT 'Helper Functions' as check_name,
         CASE
           WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_addin_only_user')
           THEN '✓ EXISTS'
           ELSE '✗ MISSING'
         END as status,
         'is_addin_only_user() function' as details
  UNION ALL
  SELECT 'Helper Functions' as check_name,
         CASE
           WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_agency_access')
           THEN '✓ EXISTS'
           ELSE '✗ MISSING'
         END as status,
         'has_agency_access() function' as details
  UNION ALL
  SELECT 'User Table Columns' as check_name,
         CASE
           WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'addin_only')
           THEN '✓ EXISTS'
           ELSE '✗ MISSING'
         END as status,
         'users.addin_only column' as details
  UNION ALL
  SELECT 'User Table Columns' as check_name,
         CASE
           WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'addin_only')
           THEN '✓ EXISTS'
           ELSE '✗ MISSING'
         END as status,
         'profiles.addin_only column' as details;
$$;

-- ========================================
-- GENERATE COMPREHENSIVE REPORT
-- ========================================

DO $$
DECLARE
  rec record;
  check_rec record;
  total_tables int := 0;
  rls_enabled_count int := 0;
  agency_protected_count int := 0;
  addin_protected_count int := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BlocIQ RLS POLICY VERIFICATION REPORT';
  RAISE NOTICE 'Generated: %', NOW();
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Check add-in access control implementation
  RAISE NOTICE 'ADD-IN ACCESS CONTROL CHECKS:';
  RAISE NOTICE '-----------------------------';
  FOR check_rec IN SELECT * FROM check_addin_user_access()
  LOOP
    RAISE NOTICE '% | %: %', check_rec.status, check_rec.check_name, check_rec.details;
  END LOOP;
  RAISE NOTICE '';

  -- Check table-level RLS policies
  RAISE NOTICE 'TABLE-LEVEL RLS ANALYSIS:';
  RAISE NOTICE '------------------------';
  RAISE NOTICE 'Table | RLS | Agency | Add-in Block | Policies | Policy Names';
  RAISE NOTICE '------|-----|---------|--------------|----------|-------------';

  FOR rec IN SELECT * FROM verify_current_rls_policies()
  LOOP
    total_tables := total_tables + 1;

    IF rec.rls_enabled THEN
      rls_enabled_count := rls_enabled_count + 1;
    END IF;

    IF rec.has_agency_id AND rec.rls_enabled THEN
      agency_protected_count := agency_protected_count + 1;
    END IF;

    IF rec.has_addin_protection THEN
      addin_protected_count := addin_protected_count + 1;
    END IF;

    RAISE NOTICE '% | % | % | % | % | %',
      RPAD(rec.table_name, 18),
      CASE WHEN rec.rls_enabled THEN '✓' ELSE '✗' END,
      CASE WHEN rec.has_agency_id THEN '✓' ELSE '✗' END,
      CASE WHEN rec.has_addin_protection THEN '✓' ELSE '✗' END,
      LPAD(rec.policy_count::text, 2),
      array_to_string(rec.policy_details, ', ');
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'SUMMARY STATISTICS:';
  RAISE NOTICE '------------------';
  RAISE NOTICE 'Total sensitive tables: %', total_tables;
  RAISE NOTICE 'Tables with RLS enabled: %', rls_enabled_count;
  RAISE NOTICE 'Tables with agency protection: %', agency_protected_count;
  RAISE NOTICE 'Tables with add-in blocking: %', addin_protected_count;
  RAISE NOTICE '';

  -- Security assessment
  RAISE NOTICE 'SECURITY ASSESSMENT:';
  RAISE NOTICE '------------------';

  IF addin_protected_count = agency_protected_count THEN
    RAISE NOTICE '✓ SECURE: All agency tables have add-in user blocking';
  ELSE
    RAISE NOTICE '⚠ WARNING: % tables missing add-in protection', agency_protected_count - addin_protected_count;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_addin_only_user') THEN
    RAISE NOTICE '✓ SECURE: Helper functions implemented';
  ELSE
    RAISE NOTICE '✗ CRITICAL: Missing access control helper functions';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'addin_only') THEN
    RAISE NOTICE '✓ SECURE: User tables have addin_only flags';
  ELSE
    RAISE NOTICE '✗ CRITICAL: Missing addin_only columns';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'RECOMMENDATIONS:';
  RAISE NOTICE '---------------';

  IF addin_protected_count < agency_protected_count THEN
    RAISE NOTICE '1. Run migration: 20250925000000_add_addin_only_access_control.sql';
    RAISE NOTICE '2. Update API endpoints to check addin_only flag';
    RAISE NOTICE '3. Test with add-in only users';
  ELSE
    RAISE NOTICE '1. ✓ RLS policies are properly configured';
    RAISE NOTICE '2. Test API endpoint access control';
    RAISE NOTICE '3. Monitor ai_endpoint_logs for usage patterns';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'END OF REPORT';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END$$;

-- Clean up verification functions
DROP FUNCTION IF EXISTS verify_current_rls_policies();
DROP FUNCTION IF EXISTS check_addin_user_access();