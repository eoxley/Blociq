-- Verification Script for Enhanced Document Analysis Migration
-- Run this after applying the migration to verify everything works

-- Check if document_analysis table exists and has new columns
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'document_analysis' 
ORDER BY ordinal_position;

-- Check if new tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'extraction_cache',
  'processing_jobs',
  'document_health',
  'validation_results'
);

-- Check if constraints were added
SELECT 
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'document_analysis'
AND constraint_type IN ('FOREIGN KEY', 'UNIQUE');

-- Check if indexes were created
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE tablename IN (
  'document_analysis',
  'extraction_cache',
  'processing_jobs',
  'document_health',
  'validation_results'
)
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN (
  'extraction_cache',
  'processing_jobs',
  'document_health',
  'validation_results'
)
ORDER BY tablename, policyname;

-- Test basic functionality (only if table exists)
DO $$
BEGIN
  -- Only run test if extraction_cache table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'extraction_cache' AND table_schema = 'public'
  ) THEN
    INSERT INTO extraction_cache (file_hash, extracted_text, ocr_method, quality_score) 
    VALUES ('test_hash_12345', 'Test extraction text', 'test_method', 0.85);
    
    RAISE NOTICE 'Test insertion successful. Cache entries: %', 
      (SELECT COUNT(*) FROM extraction_cache);
    
    -- Clean up test data
    DELETE FROM extraction_cache WHERE file_hash = 'test_hash_12345';
    
    RAISE NOTICE 'Test cleanup completed';
  ELSE
    RAISE NOTICE 'extraction_cache table does not exist - skipping test';
  END IF;
END $$;
