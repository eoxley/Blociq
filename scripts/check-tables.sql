-- Quick check of existing tables and their structure
-- This will help us understand your current database schema

-- 1. List all tables in public schema
SELECT 'All tables in public schema:' as info;
SELECT 
  '  - ' || table_name as table_list
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Check specifically for document-related tables
SELECT 'Document-related tables:' as info;
SELECT 
  '  - ' || table_name as document_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%document%'
ORDER BY table_name;

-- 3. Check building_documents structure if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'building_documents' AND table_schema = 'public'
  ) THEN
    RAISE NOTICE 'building_documents table structure:';
    PERFORM column_name || ' (' || data_type || ')'
    FROM information_schema.columns 
    WHERE table_name = 'building_documents' AND table_schema = 'public'
    ORDER BY ordinal_position;
  ELSE
    RAISE NOTICE 'building_documents table does not exist';
  END IF;
END $$;

-- 4. Check what user/role we're running as
SELECT 
  'Current user: ' || current_user as user_info,
  'Session user: ' || session_user as session_info;

-- 5. Check available schemas
SELECT 'Available schemas:' as info;
SELECT 
  '  - ' || schema_name as schema_list
FROM information_schema.schemata 
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY schema_name;
