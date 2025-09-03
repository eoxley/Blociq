-- Enhanced Document Analysis Schema with Versioning and Constraints
-- Addresses database integrity and analysis versioning requirements

-- First, ensure document_analysis table exists with correct structure
CREATE TABLE IF NOT EXISTS document_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES building_documents(id) ON DELETE CASCADE,
  extracted_text TEXT,
  summary TEXT,
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to document_analysis table (safely)
DO $$
BEGIN
  -- Add analysis_version column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_analysis' AND column_name = 'analysis_version'
  ) THEN
    ALTER TABLE document_analysis ADD COLUMN analysis_version INTEGER DEFAULT 1;
  END IF;

  -- Add ocr_method column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_analysis' AND column_name = 'ocr_method'
  ) THEN
    ALTER TABLE document_analysis ADD COLUMN ocr_method VARCHAR(50);
  END IF;

  -- Add extraction_stats column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_analysis' AND column_name = 'extraction_stats'
  ) THEN
    ALTER TABLE document_analysis ADD COLUMN extraction_stats JSONB DEFAULT '{}';
  END IF;

  -- Add validation_flags column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_analysis' AND column_name = 'validation_flags'
  ) THEN
    ALTER TABLE document_analysis ADD COLUMN validation_flags JSONB DEFAULT '{}';
  END IF;

  -- Add file_hash column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_analysis' AND column_name = 'file_hash'
  ) THEN
    ALTER TABLE document_analysis ADD COLUMN file_hash VARCHAR(64);
  END IF;

  -- Add processing_duration column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_analysis' AND column_name = 'processing_duration'
  ) THEN
    ALTER TABLE document_analysis ADD COLUMN processing_duration INTEGER DEFAULT 0;
  END IF;

  -- Add quality_score column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_analysis' AND column_name = 'quality_score'
  ) THEN
    ALTER TABLE document_analysis ADD COLUMN quality_score DECIMAL(3,2) DEFAULT 0.00;
  END IF;
END $$;

-- Add constraints safely (only if they don't exist)
DO $$
BEGIN
  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_document_analysis_document'
    AND table_name = 'document_analysis'
  ) THEN
    ALTER TABLE document_analysis 
    ADD CONSTRAINT fk_document_analysis_document 
    FOREIGN KEY (document_id) 
    REFERENCES building_documents(id) 
    ON DELETE CASCADE;
  END IF;

  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_document_analysis_version'
    AND table_name = 'document_analysis'
  ) THEN
    ALTER TABLE document_analysis 
    ADD CONSTRAINT unique_document_analysis_version 
    UNIQUE (document_id, analysis_version);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_analysis_file_hash ON document_analysis(file_hash);
CREATE INDEX IF NOT EXISTS idx_document_analysis_ocr_method ON document_analysis(ocr_method);
CREATE INDEX IF NOT EXISTS idx_document_analysis_quality_score ON document_analysis(quality_score);
CREATE INDEX IF NOT EXISTS idx_document_analysis_version ON document_analysis(analysis_version);

-- Create extraction cache table
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

-- Create processing jobs table for async processing
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES building_documents(id) ON DELETE CASCADE,
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

-- Create document health scoring table
CREATE TABLE IF NOT EXISTS document_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES building_documents(id) ON DELETE CASCADE,
    extraction_completeness DECIMAL(5,2) DEFAULT 0.00,
    structure_integrity DECIMAL(5,2) DEFAULT 0.00,
    critical_fields_present DECIMAL(5,2) DEFAULT 0.00,
    overall_health VARCHAR(20) DEFAULT 'poor' CHECK (overall_health IN ('excellent', 'good', 'acceptable', 'poor')),
    improvement_suggestions JSONB DEFAULT '[]',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create validation results table
CREATE TABLE IF NOT EXISTS validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES building_documents(id) ON DELETE CASCADE,
    property_address_match BOOLEAN DEFAULT false,
    filename_content_consistency BOOLEAN DEFAULT false,
    critical_fields_found JSONB DEFAULT '[]',
    suspicious_patterns JSONB DEFAULT '[]',
    confidence_level DECIMAL(3,2) DEFAULT 0.00,
    validation_warnings JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for new tables
CREATE INDEX IF NOT EXISTS idx_extraction_cache_file_hash ON extraction_cache(file_hash);
CREATE INDEX IF NOT EXISTS idx_extraction_cache_last_accessed ON extraction_cache(last_accessed);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_document_id ON processing_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_health_document_id ON document_health(document_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_document_id ON validation_results(document_id);

-- RLS Policies for new tables
ALTER TABLE extraction_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY;

-- Extraction cache policies (shared across users for efficiency)
CREATE POLICY "extraction_cache_select_policy" ON extraction_cache
    FOR SELECT USING (true); -- Allow all authenticated users to read cache

CREATE POLICY "extraction_cache_insert_policy" ON extraction_cache
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Processing jobs policies (simplified - allow authenticated users)
CREATE POLICY "processing_jobs_select_policy" ON processing_jobs
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "processing_jobs_insert_policy" ON processing_jobs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Document health policies (simplified - allow authenticated users)
CREATE POLICY "document_health_select_policy" ON document_health
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "document_health_insert_policy" ON document_health
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Validation results policies (simplified - allow authenticated users)
CREATE POLICY "validation_results_select_policy" ON validation_results
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "validation_results_insert_policy" ON validation_results
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Function to clean old cache entries (keep cache manageable)
CREATE OR REPLACE FUNCTION cleanup_old_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM extraction_cache 
    WHERE last_accessed < NOW() - INTERVAL '30 days'
    AND access_count < 5;
END;
$$ LANGUAGE plpgsql;

-- Function to update processing job progress
CREATE OR REPLACE FUNCTION update_job_progress(
    job_id UUID,
    new_progress INTEGER,
    new_status VARCHAR DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    UPDATE processing_jobs 
    SET 
        progress_percentage = new_progress,
        status = COALESCE(new_status, status),
        updated_at = NOW(),
        completed_at = CASE 
            WHEN new_status = 'complete' THEN NOW()
            ELSE completed_at
        END
    WHERE id = job_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON extraction_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE ON processing_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON document_health TO authenticated;
GRANT SELECT, INSERT, UPDATE ON validation_results TO authenticated;

-- Comments for documentation
COMMENT ON TABLE extraction_cache IS 'Caches OCR extraction results to avoid re-processing identical documents';
COMMENT ON TABLE processing_jobs IS 'Tracks async document processing jobs with progress updates';
COMMENT ON TABLE document_health IS 'Stores document quality and health assessments';
COMMENT ON TABLE validation_results IS 'Stores comprehensive validation results for each document';

COMMENT ON COLUMN document_analysis.analysis_version IS 'Version number for tracking analysis improvements over time';
COMMENT ON COLUMN document_analysis.ocr_method IS 'OCR method used: openai, google_vision, enhanced_vision, etc.';
COMMENT ON COLUMN document_analysis.extraction_stats IS 'JSON stats: char_count, page_count, confidence_scores';
COMMENT ON COLUMN document_analysis.validation_flags IS 'JSON flags: warnings, mismatches, quality_issues';
COMMENT ON COLUMN document_analysis.file_hash IS 'SHA-256 hash of file content for caching';
COMMENT ON COLUMN document_analysis.quality_score IS 'Overall quality score (0.00-1.00)';
