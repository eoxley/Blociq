-- ========================================
-- INTERNAL-ONLY ONBOARDING MODULE
-- Migration: 20250930000002_onboarding_module_tables.sql
-- Description: Staging tables for AI-powered data extraction and review
-- ========================================

-- ========================================
-- 1. CREATE ONBOARDING_RAW TABLE
-- ========================================

-- Raw uploads table for storing uploaded files and metadata
CREATE TABLE IF NOT EXISTS public.onboarding_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- File information
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  file_hash TEXT,
  
  -- Upload context
  uploader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  building_name TEXT,
  
  -- AI Detection
  detected_type TEXT, -- e.g. 'lease', 'FRA', 'apportionment', 'building_info', 'leaseholder_list'
  detected_category TEXT, -- e.g. 'legal', 'compliance', 'financial', 'property_info'
  confidence_score NUMERIC(3,2),
  
  -- Processing status
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. CREATE STAGING_STRUCTURED TABLE
-- ========================================

-- AI-extracted structured data awaiting review
CREATE TABLE IF NOT EXISTS public.staging_structured (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to raw upload
  raw_id UUID REFERENCES public.onboarding_raw(id) ON DELETE CASCADE NOT NULL,
  
  -- Extraction details
  suggested_table TEXT NOT NULL, -- e.g. 'leases', 'building_compliance_assets', 'units', 'leaseholders'
  extraction_method TEXT DEFAULT 'ai_analysis', -- 'ai_analysis', 'ocr_extraction', 'manual_entry'
  
  -- Extracted data
  data JSONB NOT NULL, -- The structured extracted fields
  original_text TEXT, -- Original text that was analyzed
  confidence NUMERIC(3,2), -- AI confidence in the extraction
  
  -- Review workflow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'edited')),
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  
  -- Production commit
  committed_to_production BOOLEAN DEFAULT FALSE,
  production_table_id UUID, -- ID of the record created in production table
  committed_at TIMESTAMPTZ,
  committed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 3. CREATE ONBOARDING_BATCHES TABLE
-- ========================================

-- Group related uploads into batches for organized processing
CREATE TABLE IF NOT EXISTS public.onboarding_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Batch information
  batch_name TEXT NOT NULL,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  building_name TEXT,
  
  -- Batch status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'processing', 'reviewing', 'completed', 'archived')),
  
  -- Progress tracking
  total_files INTEGER DEFAULT 0,
  processed_files INTEGER DEFAULT 0,
  accepted_records INTEGER DEFAULT 0,
  rejected_records INTEGER DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Add batch reference to onboarding_raw
ALTER TABLE public.onboarding_raw 
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.onboarding_batches(id) ON DELETE SET NULL;

-- ========================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Onboarding raw indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_raw_uploader_id ON public.onboarding_raw(uploader_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_raw_agency_id ON public.onboarding_raw(agency_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_raw_batch_id ON public.onboarding_raw(batch_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_raw_detected_type ON public.onboarding_raw(detected_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_raw_processing_status ON public.onboarding_raw(processing_status);
CREATE INDEX IF NOT EXISTS idx_onboarding_raw_created_at ON public.onboarding_raw(created_at);

-- Staging structured indexes
CREATE INDEX IF NOT EXISTS idx_staging_structured_raw_id ON public.staging_structured(raw_id);
CREATE INDEX IF NOT EXISTS idx_staging_structured_suggested_table ON public.staging_structured(suggested_table);
CREATE INDEX IF NOT EXISTS idx_staging_structured_status ON public.staging_structured(status);
CREATE INDEX IF NOT EXISTS idx_staging_structured_committed ON public.staging_structured(committed_to_production);
CREATE INDEX IF NOT EXISTS idx_staging_structured_created_at ON public.staging_structured(created_at);

-- Onboarding batches indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_batches_agency_id ON public.onboarding_batches(agency_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_batches_status ON public.onboarding_batches(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_batches_created_by ON public.onboarding_batches(created_by);

-- ========================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.onboarding_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staging_structured ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_batches ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 6. CREATE RLS POLICIES (SUPER_ADMIN ONLY)
-- ========================================

-- Onboarding raw policies
CREATE POLICY "Super admins can manage onboarding_raw" ON public.onboarding_raw
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );

-- Staging structured policies
CREATE POLICY "Super admins can manage staging_structured" ON public.staging_structured
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );

-- Onboarding batches policies
CREATE POLICY "Super admins can manage onboarding_batches" ON public.onboarding_batches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'super_admin'
    )
  );

-- ========================================
-- 7. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to get onboarding statistics
CREATE OR REPLACE FUNCTION get_onboarding_stats(batch_id_param UUID DEFAULT NULL)
RETURNS TABLE (
  total_files BIGINT,
  pending_files BIGINT,
  processing_files BIGINT,
  completed_files BIGINT,
  failed_files BIGINT,
  total_extractions BIGINT,
  pending_extractions BIGINT,
  accepted_extractions BIGINT,
  rejected_extractions BIGINT,
  committed_extractions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- File stats
    COUNT(CASE WHEN batch_id_param IS NULL OR o.batch_id = batch_id_param THEN 1 END) as total_files,
    COUNT(CASE WHEN (batch_id_param IS NULL OR o.batch_id = batch_id_param) AND o.processing_status = 'pending' THEN 1 END) as pending_files,
    COUNT(CASE WHEN (batch_id_param IS NULL OR o.batch_id = batch_id_param) AND o.processing_status = 'processing' THEN 1 END) as processing_files,
    COUNT(CASE WHEN (batch_id_param IS NULL OR o.batch_id = batch_id_param) AND o.processing_status = 'completed' THEN 1 END) as completed_files,
    COUNT(CASE WHEN (batch_id_param IS NULL OR o.batch_id = batch_id_param) AND o.processing_status = 'failed' THEN 1 END) as failed_files,
    
    -- Extraction stats
    COUNT(CASE WHEN batch_id_param IS NULL OR o.batch_id = batch_id_param THEN s.id END) as total_extractions,
    COUNT(CASE WHEN (batch_id_param IS NULL OR o.batch_id = batch_id_param) AND s.status = 'pending' THEN 1 END) as pending_extractions,
    COUNT(CASE WHEN (batch_id_param IS NULL OR o.batch_id = batch_id_param) AND s.status = 'accepted' THEN 1 END) as accepted_extractions,
    COUNT(CASE WHEN (batch_id_param IS NULL OR o.batch_id = batch_id_param) AND s.status = 'rejected' THEN 1 END) as rejected_extractions,
    COUNT(CASE WHEN (batch_id_param IS NULL OR o.batch_id = batch_id_param) AND s.committed_to_production = TRUE THEN 1 END) as committed_extractions
  FROM public.onboarding_raw o
  LEFT JOIN public.staging_structured s ON s.raw_id = o.id
  WHERE batch_id_param IS NULL OR o.batch_id = batch_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new onboarding batch
CREATE OR REPLACE FUNCTION create_onboarding_batch(
  batch_name_param TEXT,
  agency_id_param UUID,
  building_name_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  batch_id UUID;
BEGIN
  INSERT INTO public.onboarding_batches (batch_name, agency_id, building_name, created_by)
  VALUES (batch_name_param, agency_id_param, building_name_param, auth.uid())
  RETURNING id INTO batch_id;
  
  RETURN batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 8. GRANT PERMISSIONS
-- ========================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_onboarding_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_onboarding_batch(TEXT, UUID, TEXT) TO authenticated;

-- ========================================
-- 9. CREATE TRIGGERS FOR UPDATED_AT
-- ========================================

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_onboarding_raw_updated_at 
  BEFORE UPDATE ON public.onboarding_raw 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staging_structured_updated_at 
  BEFORE UPDATE ON public.staging_structured 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_batches_updated_at 
  BEFORE UPDATE ON public.onboarding_batches 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 10. ADD COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE public.onboarding_raw IS 'Raw file uploads for AI-powered data extraction';
COMMENT ON TABLE public.staging_structured IS 'AI-extracted structured data awaiting super_admin review';
COMMENT ON TABLE public.onboarding_batches IS 'Groups related onboarding files for organized processing';

COMMENT ON COLUMN public.onboarding_raw.detected_type IS 'AI-detected document type (lease, FRA, apportionment, etc.)';
COMMENT ON COLUMN public.onboarding_raw.confidence_score IS 'AI confidence in document type detection (0.0-1.0)';
COMMENT ON COLUMN public.staging_structured.suggested_table IS 'Target production table for the extracted data';
COMMENT ON COLUMN public.staging_structured.data IS 'JSONB object containing the extracted structured data';
COMMENT ON COLUMN public.staging_structured.confidence IS 'AI confidence in the data extraction (0.0-1.0)';
