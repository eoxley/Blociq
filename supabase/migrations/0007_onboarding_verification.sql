-- ========================================
-- ONBOARDING VERIFICATION SCRIPT
-- Script: 0007_onboarding_verification.sql
-- Description: Comprehensive verification of onboarding schema
-- ========================================

\echo '🔍 ONBOARDING SCHEMA VERIFICATION'
\echo '================================='

-- ========================================
-- 1. TABLE STRUCTURE VERIFICATION
-- ========================================

\echo '\n📋 1. TABLE STRUCTURE VERIFICATION'

-- Check all required tables exist
DO $$
DECLARE
  required_tables text[] := ARRAY[
    'agencies', 'agency_members', 'buildings', 'units', 'leaseholders', 
    'leases', 'unit_apportionments', 'building_documents', 
    'compliance_master_assets', 'building_compliance_assets'
  ];
  table_name text;
  missing_tables text[] := '{}';
BEGIN
  FOREACH table_name IN ARRAY required_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = table_name
    ) THEN
      missing_tables := array_append(missing_tables, table_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Missing required tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE '✅ All required tables present: %', array_length(required_tables, 1);
  END IF;
END$$;

-- ========================================
-- 2. FOREIGN KEY CONSTRAINTS VERIFICATION
-- ========================================

\echo '\n🔗 2. FOREIGN KEY CONSTRAINTS VERIFICATION'

-- Check critical foreign key relationships
SELECT 
  'Foreign Key Constraints' as check_type,
  COUNT(*) as total_fks,
  COUNT(CASE WHEN table_name = 'units' AND column_name = 'building_id' THEN 1 END) as units_to_buildings,
  COUNT(CASE WHEN table_name = 'leaseholders' AND column_name = 'unit_id' THEN 1 END) as leaseholders_to_units,
  COUNT(CASE WHEN table_name = 'leases' AND column_name = 'unit_id' THEN 1 END) as leases_to_units,
  COUNT(CASE WHEN table_name = 'unit_apportionments' AND column_name = 'building_id' THEN 1 END) as apportionments_to_buildings
FROM information_schema.key_column_usage k
JOIN information_schema.table_constraints t ON t.constraint_name = k.constraint_name
WHERE t.constraint_type = 'FOREIGN KEY' 
  AND k.table_schema = 'public'
  AND k.table_name IN ('units', 'leaseholders', 'leases', 'unit_apportionments', 'building_compliance_assets');

-- ========================================
-- 3. AGENCY_ID COLUMNS VERIFICATION
-- ========================================

\echo '\n🏢 3. AGENCY_ID COLUMNS VERIFICATION'

-- Check agency_id columns exist and are NOT NULL where required
SELECT 
  table_name,
  column_name,
  is_nullable,
  CASE 
    WHEN is_nullable = 'NO' THEN '✅ NOT NULL'
    ELSE '⚠️ NULLABLE'
  END as constraint_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'agency_id'
  AND table_name IN ('buildings', 'units', 'leaseholders', 'leases', 'unit_apportionments', 'building_compliance_assets')
ORDER BY table_name;

-- ========================================
-- 4. COMPLIANCE MASTER ASSETS VERIFICATION
-- ========================================

\echo '\n🛡️ 4. COMPLIANCE MASTER ASSETS VERIFICATION'

-- Check compliance master assets are seeded
SELECT 
  'Compliance Master Assets' as asset_type,
  COUNT(*) as total_assets,
  COUNT(CASE WHEN category = 'fire_safety' THEN 1 END) as fire_safety,
  COUNT(CASE WHEN category = 'electrical' THEN 1 END) as electrical,
  COUNT(CASE WHEN category = 'gas' THEN 1 END) as gas,
  COUNT(CASE WHEN category = 'structural' THEN 1 END) as structural,
  COUNT(CASE WHEN is_mandatory = true THEN 1 END) as mandatory,
  COUNT(CASE WHEN applies_to_hrb_only = true THEN 1 END) as hrb_only
FROM public.compliance_master_assets;

-- Show key compliance assets
SELECT 
  asset_code,
  asset_name,
  category,
  frequency_months,
  is_mandatory,
  applies_to_hrb_only
FROM public.compliance_master_assets
WHERE asset_code IN ('EICR', 'FRA', 'GAS_SAFETY', 'FIRE_DOORS', 'LIFT_MAINTENANCE')
ORDER BY category, asset_code;

-- ========================================
-- 5. RLS POLICIES VERIFICATION
-- ========================================

\echo '\n🔒 5. RLS POLICIES VERIFICATION'

-- Check RLS is enabled and policies exist
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
    'leases', 'unit_apportionments', 'building_documents', 
    'compliance_master_assets', 'building_compliance_assets'
  )
ORDER BY c.relname;

-- ========================================
-- 6. INDEXES VERIFICATION
-- ========================================

\echo '\n⚡ 6. PERFORMANCE INDEXES VERIFICATION'

-- Check critical indexes exist
SELECT 
  'Performance Indexes' as check_type,
  COUNT(*) as total_indexes,
  COUNT(CASE WHEN indexname LIKE '%agency%' THEN 1 END) as agency_indexes,
  COUNT(CASE WHEN indexname LIKE '%building%' THEN 1 END) as building_indexes,
  COUNT(CASE WHEN indexname LIKE '%unit%' THEN 1 END) as unit_indexes
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('buildings', 'units', 'leaseholders', 'leases', 'unit_apportionments', 'compliance_master_assets');

-- ========================================
-- 7. SAMPLE DATA IMPORT SIMULATION
-- ========================================

\echo '\n📊 7. SAMPLE DATA IMPORT SIMULATION'

-- Create a test agency to verify the schema works
DO $$
DECLARE
  test_agency_id uuid;
  test_building_id uuid;
  test_unit_id uuid;
  test_leaseholder_id uuid;
BEGIN
  -- Insert test agency
  INSERT INTO public.agencies (name, slug, contact_email, onboarding_status)
  VALUES ('Test Agency Ltd', 'test-agency', 'test@testagency.co.uk', 'in_progress')
  RETURNING id INTO test_agency_id;
  
  -- Insert test building
  INSERT INTO public.buildings (agency_id, name, address, postcode, total_units, is_hrb)
  VALUES (test_agency_id, 'Test Building', '123 Test Street, London', 'SW1A 1AA', 2, false)
  RETURNING id INTO test_building_id;
  
  -- Insert test unit
  INSERT INTO public.units (agency_id, building_id, unit_number, unit_type, bedrooms)
  VALUES (test_agency_id, test_building_id, 'Flat 1', 'flat', 2)
  RETURNING id INTO test_unit_id;
  
  -- Insert test leaseholder
  INSERT INTO public.leaseholders (agency_id, unit_id, name, email, is_director)
  VALUES (test_agency_id, test_unit_id, 'Test Leaseholder', 'test@leaseholder.com', true)
  RETURNING id INTO test_leaseholder_id;
  
  -- Insert test lease
  INSERT INTO public.leases (agency_id, building_id, unit_id, lease_type, start_date, expiry_date)
  VALUES (test_agency_id, test_building_id, test_unit_id, 'residential', '2020-01-01', '2099-12-31');
  
  -- Insert test apportionment
  INSERT INTO public.unit_apportionments (agency_id, building_id, unit_id, apportionment_type, percentage)
  VALUES (test_agency_id, test_building_id, test_unit_id, 'service_charge', 50.000);
  
  -- Insert test compliance asset
  INSERT INTO public.building_compliance_assets (
    agency_id, building_id, compliance_master_asset_id, status, next_inspection_due
  )
  SELECT 
    test_agency_id, 
    test_building_id,
    id,
    'pending',
    CURRENT_DATE + INTERVAL '1 year'
  FROM public.compliance_master_assets 
  WHERE asset_code = 'FRA'
  LIMIT 1;
  
  RAISE NOTICE '✅ Test data created successfully';
  RAISE NOTICE '   - Agency ID: %', test_agency_id;
  RAISE NOTICE '   - Building ID: %', test_building_id;
  RAISE NOTICE '   - Unit ID: %', test_unit_id;
  RAISE NOTICE '   - Leaseholder ID: %', test_leaseholder_id;
END$$;

-- Verify test data relationships
SELECT 
  'Test Data Verification' as check_type,
  a.name as agency_name,
  b.name as building_name,
  u.unit_number,
  l.name as leaseholder_name,
  lease.lease_type,
  apport.percentage as service_charge_percent,
  comp.status as compliance_status
FROM public.agencies a
JOIN public.buildings b ON b.agency_id = a.id
JOIN public.units u ON u.building_id = b.id
JOIN public.leaseholders l ON l.unit_id = u.id
LEFT JOIN public.leases lease ON lease.unit_id = u.id
LEFT JOIN public.unit_apportionments apport ON apport.unit_id = u.id AND apport.apportionment_type = 'service_charge'
LEFT JOIN public.building_compliance_assets comp ON comp.building_id = b.id
WHERE a.slug = 'test-agency';

-- Clean up test data
DELETE FROM public.agencies WHERE slug = 'test-agency';

-- ========================================
-- 8. CSV IMPORT READINESS CHECK
-- ========================================

\echo '\n📁 8. CSV IMPORT READINESS CHECK'

-- Check if tables are ready for CSV import
DO $$
DECLARE
  table_info record;
  import_ready boolean := true;
BEGIN
  RAISE NOTICE 'CSV Import Readiness:';
  
  -- Check each table has the expected structure
  FOR table_info IN 
    SELECT 
      t.table_name,
      COUNT(c.column_name) as column_count,
      COUNT(CASE WHEN c.column_name = 'agency_id' THEN 1 END) as has_agency_id,
      COUNT(CASE WHEN c.is_nullable = 'NO' AND c.column_default IS NULL THEN 1 END) as required_fields
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = t.table_schema
    WHERE t.table_schema = 'public' 
      AND t.table_name IN ('agencies', 'buildings', 'units', 'leaseholders', 'leases', 'unit_apportionments', 'building_compliance_assets')
    GROUP BY t.table_name
    ORDER BY t.table_name
  LOOP
    RAISE NOTICE '  - %: % columns, agency_id: %, required fields: %', 
      table_info.table_name, 
      table_info.column_count,
      CASE WHEN table_info.has_agency_id > 0 OR table_info.table_name = 'agencies' THEN '✅' ELSE '❌' END,
      table_info.required_fields;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'CSV Templates available in csv-templates/ directory:';
  RAISE NOTICE '  - agencies.csv';
  RAISE NOTICE '  - buildings.csv';
  RAISE NOTICE '  - units.csv';
  RAISE NOTICE '  - leaseholders.csv';
  RAISE NOTICE '  - leases.csv';
  RAISE NOTICE '  - unit_apportionments.csv';
  RAISE NOTICE '  - building_documents.csv';
  RAISE NOTICE '  - building_compliance_assets.csv';
END$$;

-- ========================================
-- 9. FINAL SUMMARY
-- ========================================

\echo '\n📋 9. FINAL VERIFICATION SUMMARY'

DO $$
DECLARE
  table_count int;
  fk_count int;
  policy_count int;
  compliance_count int;
  index_count int;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('agencies', 'agency_members', 'buildings', 'units', 'leaseholders', 'leases', 'unit_apportionments', 'building_documents', 'compliance_master_assets', 'building_compliance_assets');
  
  -- Count foreign keys
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints 
  WHERE table_schema = 'public' 
    AND constraint_type = 'FOREIGN KEY'
    AND table_name IN ('units', 'leaseholders', 'leases', 'unit_apportionments', 'building_compliance_assets');
  
  -- Count RLS policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public'
    AND (policyname ILIKE '%agency%' OR policyname ILIKE '%own%');
  
  -- Count compliance assets
  SELECT COUNT(*) INTO compliance_count
  FROM public.compliance_master_assets;
  
  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('buildings', 'units', 'leaseholders', 'leases', 'unit_apportionments', 'compliance_master_assets');
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '           VERIFICATION SUMMARY';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'Tables Created: % / 10', table_count;
  RAISE NOTICE 'Foreign Keys: % constraints', fk_count;
  RAISE NOTICE 'RLS Policies: % policies', policy_count;
  RAISE NOTICE 'Compliance Assets: % seeded', compliance_count;
  RAISE NOTICE 'Performance Indexes: % created', index_count;
  RAISE NOTICE '';
  
  IF table_count = 10 AND fk_count >= 8 AND compliance_count >= 15 THEN
    RAISE NOTICE '🎉 ONBOARDING SCHEMA VERIFICATION PASSED';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Import CSV templates using Supabase Table Editor';
    RAISE NOTICE '2. Verify MIH data appears in BlocIQ frontend';
    RAISE NOTICE '3. Test agency switching and data isolation';
    RAISE NOTICE '4. Onboard additional agencies as needed';
  ELSE
    RAISE WARNING '⚠️ ONBOARDING SCHEMA VERIFICATION FAILED';
    RAISE WARNING 'Please review the individual checks above';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════';
END$$;
