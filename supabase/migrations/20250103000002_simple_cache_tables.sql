-- Simplified Migration: Create Essential Tables Without Complex Dependencies
-- This creates the core tables needed for the enhanced document analysis system

-- 1. Create extraction cache table (no foreign keys)
CREATE TABLE IF NOT EXISTS extraction_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_hash VARCHAR(64) UNIQUE NOT NULL,
    extracted_text TEXT NOT NULL,
    ocr_method VARCHAR(50) NOT NULL,
    extraction_stats JSONB DEFAULT '{}',
    quality_score DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_count INTEGER DEFAULT 1
);

-- 2. Create processing jobs table (with optional foreign key)
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID, -- No foreign key constraint initially
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'complete', 'failed')),
    job_type VARCHAR(50) NOT NULL,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    estimated_completion TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    result_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Create document health table (with optional foreign key)
CREATE TABLE IF NOT EXISTS document_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID, -- No foreign key constraint initially
    extraction_completeness DECIMAL(5,2) DEFAULT 0.00,
    structure_integrity DECIMAL(5,2) DEFAULT 0.00,
    critical_fields_present DECIMAL(5,2) DEFAULT 0.00,
    overall_health VARCHAR(20) DEFAULT 'poor' CHECK (overall_health IN ('excellent', 'good', 'acceptable', 'poor')),
    improvement_suggestions JSONB DEFAULT '[]',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create validation results table (with optional foreign key)
CREATE TABLE IF NOT EXISTS validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID, -- No foreign key constraint initially
    property_address_match BOOLEAN DEFAULT false,
    filename_content_consistency BOOLEAN DEFAULT false,
    critical_fields_found JSONB DEFAULT '[]',
    suspicious_patterns JSONB DEFAULT '[]',
    confidence_level DECIMAL(3,2) DEFAULT 0.00,
    validation_warnings JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enhance document_analysis table if it exists
DO $$
BEGIN
  -- Only enhance if the table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'document_analysis' AND table_schema = 'public'
  ) THEN
    
    -- Add new columns safely
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'document_analysis' AND column_name = 'analysis_version'
    ) THEN
      ALTER TABLE document_analysis ADD COLUMN analysis_version INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'document_analysis' AND column_name = 'ocr_method'
    ) THEN
      ALTER TABLE document_analysis ADD COLUMN ocr_method VARCHAR(50);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'document_analysis' AND column_name = 'extraction_stats'
    ) THEN
      ALTER TABLE document_analysis ADD COLUMN extraction_stats JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'document_analysis' AND column_name = 'validation_flags'
    ) THEN
      ALTER TABLE document_analysis ADD COLUMN validation_flags JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'document_analysis' AND column_name = 'file_hash'
    ) THEN
      ALTER TABLE document_analysis ADD COLUMN file_hash VARCHAR(64);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'document_analysis' AND column_name = 'processing_duration'
    ) THEN
      ALTER TABLE document_analysis ADD COLUMN processing_duration INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'document_analysis' AND column_name = 'quality_score'
    ) THEN
      ALTER TABLE document_analysis ADD COLUMN quality_score DECIMAL(3,2) DEFAULT 0.00;
    END IF;
    
    RAISE NOTICE 'Enhanced document_analysis table with new columns';
  ELSE
    RAISE NOTICE 'document_analysis table not found - skipping enhancement';
  END IF;
END $$;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_extraction_cache_file_hash ON extraction_cache(file_hash);
CREATE INDEX IF NOT EXISTS idx_extraction_cache_last_accessed ON extraction_cache(last_accessed);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_document_id ON processing_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_health_document_id ON document_health(document_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_document_id ON validation_results(document_id);

-- 7. Add indexes to document_analysis if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'document_analysis' AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_document_analysis_file_hash ON document_analysis(file_hash);
    CREATE INDEX IF NOT EXISTS idx_document_analysis_ocr_method ON document_analysis(ocr_method);
    CREATE INDEX IF NOT EXISTS idx_document_analysis_quality_score ON document_analysis(quality_score);
    CREATE INDEX IF NOT EXISTS idx_document_analysis_version ON document_analysis(analysis_version);
  END IF;
END $$;

-- 8. Enable RLS and create basic policies
ALTER TABLE extraction_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY;

-- Simple policies - allow all authenticated users (with safe creation)
DO $$
BEGIN
  -- Create policies only if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'extraction_cache' AND policyname = 'extraction_cache_all'
  ) THEN
    CREATE POLICY "extraction_cache_all" ON extraction_cache FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'processing_jobs' AND policyname = 'processing_jobs_all'
  ) THEN
    CREATE POLICY "processing_jobs_all" ON processing_jobs FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'document_health' AND policyname = 'document_health_all'
  ) THEN
    CREATE POLICY "document_health_all" ON document_health FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'validation_results' AND policyname = 'validation_results_all'
  ) THEN
    CREATE POLICY "validation_results_all" ON validation_results FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 9. Grant permissions
GRANT ALL ON extraction_cache TO authenticated;
GRANT ALL ON processing_jobs TO authenticated;
GRANT ALL ON document_health TO authenticated;
GRANT ALL ON validation_results TO authenticated;

-- 10. Create helper functions
CREATE OR REPLACE FUNCTION cleanup_old_cache(max_age_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM extraction_cache 
  WHERE last_accessed < NOW() - INTERVAL '1 day' * max_age_days
  AND access_count < 3;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 11. Add table comments
COMMENT ON TABLE extraction_cache IS 'Caches OCR extraction results to avoid re-processing identical documents';
COMMENT ON TABLE processing_jobs IS 'Tracks async document processing jobs with progress updates';
COMMENT ON TABLE document_health IS 'Stores document quality and health assessments';
COMMENT ON TABLE validation_results IS 'Stores comprehensive validation results for each document';

-- 12. Test basic functionality
INSERT INTO extraction_cache (file_hash, extracted_text, ocr_method, quality_score) 
VALUES ('test_simple_migration', 'Test extraction for simple migration', 'test_method', 0.90);

-- Verify and clean up
SELECT 'Simple migration test: ' || 
CASE WHEN COUNT(*) > 0 THEN 'SUCCESS' ELSE 'FAILED' END as result
FROM extraction_cache WHERE file_hash = 'test_simple_migration';

DELETE FROM extraction_cache WHERE file_hash = 'test_simple_migration';

-- Success message
SELECT 'Simple migration completed successfully!' as status;
