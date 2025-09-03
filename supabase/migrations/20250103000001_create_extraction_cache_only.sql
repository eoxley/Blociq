-- Minimal Migration: Create Extraction Cache Table Only
-- This isolates the extraction cache creation to identify any specific issues

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

-- Create indexes for extraction cache
CREATE INDEX IF NOT EXISTS idx_extraction_cache_file_hash ON extraction_cache(file_hash);
CREATE INDEX IF NOT EXISTS idx_extraction_cache_last_accessed ON extraction_cache(last_accessed);

-- Enable RLS on extraction cache
ALTER TABLE extraction_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for extraction cache (allow all authenticated users)
CREATE POLICY "extraction_cache_select_policy" ON extraction_cache
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "extraction_cache_insert_policy" ON extraction_cache
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "extraction_cache_update_policy" ON extraction_cache
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON extraction_cache TO authenticated;

-- Test insertion to verify it works
INSERT INTO extraction_cache (file_hash, extracted_text, ocr_method, quality_score) 
VALUES ('test_hash_minimal', 'Test extraction text for minimal migration', 'test_method', 0.75);

-- Verify the insertion worked
SELECT COUNT(*) as test_count FROM extraction_cache WHERE file_hash = 'test_hash_minimal';

-- Clean up test data
DELETE FROM extraction_cache WHERE file_hash = 'test_hash_minimal';

-- Add comment for documentation
COMMENT ON TABLE extraction_cache IS 'Caches OCR extraction results to avoid re-processing identical documents';
