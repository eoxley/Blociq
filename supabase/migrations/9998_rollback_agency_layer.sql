-- ========================================
-- MULTI-AGENCY ROLLBACK SCRIPT
-- Script: 9998_rollback_agency_layer.sql
-- Description: Emergency rollback for multi-agency implementation
-- ========================================

-- WARNING: This script will remove all multi-agency functionality
-- Use only in emergencies or for testing purposes

\echo '⚠️  MULTI-AGENCY ROLLBACK SCRIPT'
\echo '=================================='
\echo 'This will remove all multi-agency functionality.'
\echo 'Continue only if you are sure!'

-- 1) Disable RLS temporarily for safe cleanup
\echo '\n🔓 1. TEMPORARILY DISABLING RLS FOR CLEANUP'

DO $$
DECLARE
  table_name text;
  domain_tables text[] := ARRAY[
    'buildings', 'units', 'leaseholders', 'building_documents', 'incoming_emails',
    'building_compliance_assets', 'compliance_assets', 'ai_logs', 'email_history',
    'sent_emails', 'building_setup', 'leases', 'contractors', 'compliance_inspections',
    'building_compliance_config', 'compliance_notifications', 'property_events',
    'calendar_events', 'works_orders', 'connected_accounts', 'agencies', 'agency_members'
  ];
BEGIN
  FOREACH table_name IN ARRAY domain_tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = table_name) THEN
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_name);
      RAISE NOTICE 'Disabled RLS on %', table_name;
    END IF;
  END LOOP;
END$$;

-- 2) Drop all agency-related policies
\echo '\n🗑️  2. DROPPING AGENCY POLICIES'

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND (policyname ILIKE '%agency%' OR policyname ILIKE '%own%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      policy_record.policyname, policy_record.schemaname, policy_record.tablename);
    RAISE NOTICE 'Dropped policy % on %', policy_record.policyname, policy_record.tablename;
  END LOOP;
END$$;

-- 3) Drop agency helper functions
\echo '\n🔧 3. DROPPING HELPER FUNCTIONS'

DROP FUNCTION IF EXISTS public.is_member_of_agency(uuid);
DROP FUNCTION IF EXISTS public.get_user_agency_role(uuid);
DROP FUNCTION IF EXISTS public.is_agency_manager_or_above(uuid);
DROP FUNCTION IF EXISTS public.get_agency_active_connections(uuid, text);
DROP FUNCTION IF EXISTS public.refresh_expired_tokens();
DROP FUNCTION IF EXISTS public.update_connection_status(uuid, text, text);

-- 4) Drop connected_accounts table and view
\echo '\n🔗 4. DROPPING CONNECTED ACCOUNTS'

DROP VIEW IF EXISTS public.vw_agency_connections;
DROP TABLE IF EXISTS public.connected_accounts;

-- 5) Remove agency_id columns (CAREFUL - this will lose data!)
\echo '\n⚠️  5. REMOVING AGENCY_ID COLUMNS (DATA LOSS WARNING)'

-- Function to safely remove agency_id column
CREATE OR REPLACE FUNCTION remove_agency_id_column(table_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' 
      AND table_name = remove_agency_id_column.table_name 
      AND column_name='agency_id'
  ) THEN
    -- Drop the index first
    EXECUTE format('DROP INDEX IF EXISTS %I', table_name || '_agency_idx');
    -- Drop the column
    EXECUTE format('ALTER TABLE public.%I DROP COLUMN agency_id', table_name);
    RAISE NOTICE 'Removed agency_id column from %', table_name;
  ELSE
    RAISE NOTICE 'agency_id column does not exist in %', table_name;
  END IF;
END;
$$;

-- Remove agency_id from all domain tables
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
      PERFORM remove_agency_id_column(table_name);
    END IF;
  END LOOP;
END$$;

-- 6) Drop agency membership table
\echo '\n👥 6. DROPPING AGENCY MEMBERSHIP'

DROP TABLE IF EXISTS public.agency_members;

-- 7) Drop agency role enum
\echo '\n🏷️  7. DROPPING AGENCY ROLE ENUM'

DROP TYPE IF EXISTS public.agency_role;

-- 8) Reset agencies table to basic structure (or drop completely)
\echo '\n🏢 8. RESETTING AGENCIES TABLE'

-- Option A: Reset to basic structure
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='agencies') THEN
    -- Remove added columns
    ALTER TABLE public.agencies DROP COLUMN IF EXISTS slug;
    ALTER TABLE public.agencies DROP COLUMN IF EXISTS status;
    ALTER TABLE public.agencies DROP COLUMN IF EXISTS domain;
    ALTER TABLE public.agencies DROP COLUMN IF EXISTS logo_url;
    ALTER TABLE public.agencies DROP COLUMN IF EXISTS created_by;
    RAISE NOTICE 'Reset agencies table to basic structure';
  END IF;
END$$;

-- Option B: Drop agencies table completely (uncomment if needed)
-- DROP TABLE IF EXISTS public.agencies;

-- 9) Clean up helper function
DROP FUNCTION IF EXISTS remove_agency_id_column(text);

-- 10) Re-enable basic RLS where it was previously enabled
\echo '\n🔒 10. RE-ENABLING BASIC RLS'

DO $$
DECLARE
  table_name text;
  tables_with_rls text[] := ARRAY[
    'building_compliance_assets', 'compliance_assets', 'ai_logs', 
    'building_documents', 'incoming_emails', 'sent_emails',
    'compliance_inspections', 'building_compliance_config', 
    'compliance_notifications'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables_with_rls
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = table_name) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      
      -- Add basic user-based policy (adjust as needed for your original setup)
      EXECUTE format($fmt$
        CREATE POLICY "%s_user_policy" ON public.%I
        FOR ALL USING (auth.uid() = user_id)
      $fmt$, table_name, table_name);
      
      RAISE NOTICE 'Re-enabled RLS on % with basic user policy', table_name;
    END IF;
  END LOOP;
END$$;

-- 11) Update users table to remove agency_id if it was added
\echo '\n👤 11. CLEANING UP USERS TABLE'

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='agency_id'
  ) THEN
    ALTER TABLE public.users DROP COLUMN agency_id;
    RAISE NOTICE 'Removed agency_id from users table';
  END IF;
END$$;

-- 12) Update profiles table to remove agency_id if it was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='agency_id'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN agency_id;
    RAISE NOTICE 'Removed agency_id from profiles table';
  END IF;
END$$;

-- 13) Verification
\echo '\n✅ 13. ROLLBACK VERIFICATION'

DO $$
DECLARE
  remaining_policies int;
  remaining_functions int;
  remaining_agency_columns int;
BEGIN
  -- Count remaining agency policies
  SELECT COUNT(*) INTO remaining_policies
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND (policyname ILIKE '%agency%');
  
  -- Count remaining agency functions
  SELECT COUNT(*) INTO remaining_functions
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname ILIKE '%agency%';
  
  -- Count remaining agency_id columns
  SELECT COUNT(*) INTO remaining_agency_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'agency_id';
  
  RAISE NOTICE 'ROLLBACK SUMMARY:';
  RAISE NOTICE '- Remaining agency policies: %', remaining_policies;
  RAISE NOTICE '- Remaining agency functions: %', remaining_functions;
  RAISE NOTICE '- Remaining agency_id columns: %', remaining_agency_columns;
  
  IF remaining_policies = 0 AND remaining_functions = 0 AND remaining_agency_columns = 0 THEN
    RAISE NOTICE '✅ ROLLBACK COMPLETED SUCCESSFULLY';
  ELSE
    RAISE WARNING '⚠️  ROLLBACK INCOMPLETE - Manual cleanup may be required';
  END IF;
END$$;

\echo '\n🎯 ROLLBACK COMPLETE'
\echo '==================='
\echo 'The multi-agency layer has been removed.'
\echo 'You may need to restart your application and clear any cached data.'
\echo 'If you experience issues, check the application logs and'
\echo 'ensure all agency-related code is commented out or removed.'
