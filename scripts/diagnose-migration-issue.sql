-- Diagnostic Script to Identify Migration Issues
-- Run this to see exactly what's missing and what exists

-- 1. Check if document_analysis table exists
SELECT 'document_analysis table exists: ' || 
CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'document_analysis' AND table_schema = 'public'
) THEN 'YES' ELSE 'NO' END as status;

-- 2. Check document_analysis columns
SELECT 'document_analysis columns:' as info;
SELECT 
  '  - ' || column_name || ' (' || data_type || ')' as column_info
FROM information_schema.columns 
WHERE table_name = 'document_analysis' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if building_documents table exists (dependency)
SELECT 'building_documents table exists: ' || 
CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'building_documents' AND table_schema = 'public'
) THEN 'YES' ELSE 'NO' END as status;

-- 4. Check if extraction_cache table exists
SELECT 'extraction_cache table exists: ' || 
CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'extraction_cache' AND table_schema = 'public'
) THEN 'YES' ELSE 'NO' END as status;

-- 5. Check if processing_jobs table exists
SELECT 'processing_jobs table exists: ' || 
CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'processing_jobs' AND table_schema = 'public'
) THEN 'YES' ELSE 'NO' END as status;

-- 6. Check if document_health table exists
SELECT 'document_health table exists: ' || 
CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'document_health' AND table_schema = 'public'
) THEN 'YES' ELSE 'NO' END as status;

-- 7. Check if validation_results table exists
SELECT 'validation_results table exists: ' || 
CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'validation_results' AND table_schema = 'public'
) THEN 'YES' ELSE 'NO' END as status;

-- 8. Check for any constraint conflicts
SELECT 'Checking for constraint conflicts:' as info;
SELECT 
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name IN ('document_analysis', 'building_documents')
AND constraint_type = 'FOREIGN KEY';

-- 9. Check for PostgreSQL extensions
SELECT 'PostgreSQL extensions:' as info;
SELECT 
  '  - ' || extname as extension_name
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto');

-- 10. Test basic table creation (to see if there are permission issues)
DO $$
BEGIN
  -- Try to create a simple test table
  CREATE TABLE IF NOT EXISTS migration_test (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_field TEXT
  );
  
  -- Insert test data
  INSERT INTO migration_test (test_field) VALUES ('test');
  
  -- Check if it worked
  RAISE NOTICE 'Test table creation: SUCCESS';
  
  -- Clean up
  DROP TABLE migration_test;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test table creation: FAILED - %', SQLERRM;
END $$;
