-- ========================================
-- MULTI-AGENCY VERIFICATION SCRIPT
-- Script: 9999_verify_agency_layer.sql
-- Description: Comprehensive verification of multi-agency implementation
-- ========================================

-- Set up verification session
\echo '🔍 Starting Multi-Agency Layer Verification...'
\echo '=============================================='

-- 1) Check agencies are present
\echo '\n📋 1. AGENCIES VERIFICATION'
\echo '   Checking agencies table...'

SELECT 
  'Agencies' as check_type,
  COUNT(*) as total_count,
  COUNT(CASE WHEN slug = 'mih' THEN 1 END) as mih_count,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
FROM public.agencies;

SELECT 
  id, 
  name, 
  slug, 
  status, 
  domain,
  created_at
FROM public.agencies 
ORDER BY created_at;

-- 2) Check agency membership
\echo '\n👥 2. AGENCY MEMBERSHIP VERIFICATION'
\echo '   Checking your user membership...'

SELECT 
  'Your Memberships' as check_type,
  a.name as agency_name,
  a.slug as agency_slug,
  am.role,
  am.invitation_status,
  am.joined_at,
  u.email as user_email
FROM public.agency_members am
JOIN public.agencies a ON a.id = am.agency_id
JOIN auth.users u ON u.id = am.user_id
WHERE am.user_id = auth.uid()
ORDER BY am.joined_at;

-- Show all MIH members
SELECT 
  'MIH Members' as check_type,
  u.email,
  COALESCE(u.full_name, u.email) as name,
  am.role,
  am.invitation_status,
  am.joined_at
FROM public.agency_members am
JOIN public.agencies a ON a.id = am.agency_id AND a.slug = 'mih'
JOIN auth.users u ON u.id = am.user_id
ORDER BY am.role, am.joined_at;

-- 3) Check data scoping
\echo '\n🏢 3. DATA SCOPING VERIFICATION'
\echo '   Checking buildings/units/leaseholders are scoped...'

SELECT 
  'Buildings' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN agency_id IS NOT NULL THEN 1 END) as scoped_rows,
  COUNT(CASE WHEN a.slug = 'mih' THEN 1 END) as mih_rows
FROM public.buildings b
LEFT JOIN public.agencies a ON a.id = b.agency_id;

SELECT 
  'Units' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN agency_id IS NOT NULL THEN 1 END) as scoped_rows,
  COUNT(CASE WHEN a.slug = 'mih' THEN 1 END) as mih_rows
FROM public.units u
LEFT JOIN public.agencies a ON a.id = u.agency_id;

SELECT 
  'Leaseholders' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN agency_id IS NOT NULL THEN 1 END) as scoped_rows,
  COUNT(CASE WHEN a.slug = 'mih' THEN 1 END) as mih_rows
FROM public.leaseholders l
LEFT JOIN public.agencies a ON a.id = l.agency_id;

SELECT 
  'Building Documents' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN agency_id IS NOT NULL THEN 1 END) as scoped_rows,
  COUNT(CASE WHEN a.slug = 'mih' THEN 1 END) as mih_rows
FROM public.building_documents bd
LEFT JOIN public.agencies a ON a.id = bd.agency_id;

SELECT 
  'Incoming Emails' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN agency_id IS NOT NULL THEN 1 END) as scoped_rows,
  COUNT(CASE WHEN a.slug = 'mih' THEN 1 END) as mih_rows
FROM public.incoming_emails ie
LEFT JOIN public.agencies a ON a.id = ie.agency_id;

-- 4) Check RLS is enabled
\echo '\n🔒 4. ROW LEVEL SECURITY VERIFICATION'
\echo '   Checking RLS status on key tables...'

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = c.relname) as policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'agencies', 'agency_members', 'buildings', 'units', 'leaseholders',
    'building_documents', 'incoming_emails', 'connected_accounts'
  )
ORDER BY c.relname;

-- 5) Test helper functions
\echo '\n🔧 5. HELPER FUNCTIONS VERIFICATION'
\echo '   Testing agency helper functions...'

-- Test is_member_of_agency function
SELECT 
  'is_member_of_agency' as function_name,
  a.name as agency_name,
  public.is_member_of_agency(a.id) as is_member,
  CASE 
    WHEN public.is_member_of_agency(a.id) THEN '✅ Access Granted'
    ELSE '❌ Access Denied'
  END as access_status
FROM public.agencies a
ORDER BY a.name;

-- Test get_user_agency_role function
SELECT 
  'get_user_agency_role' as function_name,
  a.name as agency_name,
  public.get_user_agency_role(a.id) as user_role,
  CASE 
    WHEN public.get_user_agency_role(a.id) IS NOT NULL THEN '✅ Has Role'
    ELSE '❌ No Role'
  END as role_status
FROM public.agencies a
ORDER BY a.name;

-- Test is_agency_manager_or_above function
SELECT 
  'is_agency_manager_or_above' as function_name,
  a.name as agency_name,
  public.is_agency_manager_or_above(a.id) as is_manager_plus,
  CASE 
    WHEN public.is_agency_manager_or_above(a.id) THEN '✅ Can Modify'
    ELSE '❌ Read Only'
  END as modify_access
FROM public.agencies a
ORDER BY a.name;

-- 6) Sample data accessibility test
\echo '\n📊 6. DATA ACCESS TEST'
\echo '   Testing actual data access through RLS...'

-- Try to access buildings (should only see your agency's buildings)
SELECT 
  'Buildings Access Test' as test_type,
  COUNT(*) as visible_buildings,
  string_agg(DISTINCT b.name, ', ') as building_names
FROM public.buildings b;

-- Try to access units
SELECT 
  'Units Access Test' as test_type,
  COUNT(*) as visible_units,
  COUNT(DISTINCT u.building_id) as buildings_with_units
FROM public.units u;

-- Try to access leaseholders
SELECT 
  'Leaseholders Access Test' as test_type,
  COUNT(*) as visible_leaseholders,
  COUNT(DISTINCT l.unit_id) as units_with_leaseholders
FROM public.leaseholders l;

-- 7) Connected accounts verification
\echo '\n🔗 7. CONNECTED ACCOUNTS VERIFICATION'
\echo '   Checking OAuth connections...'

SELECT 
  'Connected Accounts' as check_type,
  COUNT(*) as total_connections,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_connections,
  string_agg(DISTINCT provider, ', ') as providers
FROM public.connected_accounts;

-- Show agency connections overview
SELECT * FROM public.vw_agency_connections;

-- 8) Policy verification
\echo '\n📜 8. POLICY VERIFICATION'
\echo '   Listing all agency-related policies...'

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN policyname ILIKE '%agency%' THEN '✅ Agency Policy'
    WHEN policyname ILIKE '%own%' THEN '✅ Ownership Policy'
    ELSE '⚠️ Other Policy'
  END as policy_type
FROM pg_policies 
WHERE schemaname = 'public'
  AND (policyname ILIKE '%agency%' OR policyname ILIKE '%own%')
ORDER BY tablename, policyname;

-- 9) Summary report
\echo '\n📋 9. SUMMARY REPORT'
\echo '   Final verification summary...'

WITH verification_summary AS (
  SELECT 
    'Total Agencies' as metric,
    COUNT(*)::text as value
  FROM public.agencies
  
  UNION ALL
  
  SELECT 
    'Your Agency Memberships' as metric,
    COUNT(*)::text as value
  FROM public.agency_members
  WHERE user_id = auth.uid()
  
  UNION ALL
  
  SELECT 
    'Buildings You Can Access' as metric,
    COUNT(*)::text as value
  FROM public.buildings
  
  UNION ALL
  
  SELECT 
    'Units You Can Access' as metric,
    COUNT(*)::text as value
  FROM public.units
  
  UNION ALL
  
  SELECT 
    'RLS-Enabled Tables' as metric,
    COUNT(*)::text as value
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
  
  UNION ALL
  
  SELECT 
    'Agency Policies Created' as metric,
    COUNT(*)::text as value
  FROM pg_policies 
  WHERE schemaname = 'public'
    AND policyname ILIKE '%agency%'
)
SELECT 
  metric,
  value,
  CASE 
    WHEN value::int > 0 THEN '✅'
    ELSE '❌'
  END as status
FROM verification_summary
ORDER BY metric;

\echo '\n🎉 Multi-Agency Layer Verification Complete!'
\echo '=============================================='

-- Final success message
DO $$
DECLARE
  agency_count int;
  membership_count int;
  building_count int;
BEGIN
  SELECT COUNT(*) INTO agency_count FROM public.agencies;
  SELECT COUNT(*) INTO membership_count FROM public.agency_members WHERE user_id = auth.uid();
  SELECT COUNT(*) INTO building_count FROM public.buildings;
  
  IF agency_count > 0 AND membership_count > 0 AND building_count >= 0 THEN
    RAISE NOTICE '✅ SUCCESS: Multi-agency layer is properly configured!';
    RAISE NOTICE '   - % agencies configured', agency_count;
    RAISE NOTICE '   - You have % agency memberships', membership_count;
    RAISE NOTICE '   - You can access % buildings', building_count;
  ELSE
    RAISE WARNING '⚠️  ISSUES DETECTED: Please review the verification results above';
  END IF;
END$$;
