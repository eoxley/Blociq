-- Fix missing database tables causing 500 errors
-- This migration ensures essential tables exist for document upload and analysis

BEGIN;

-- Ensure document_analysis table exists
CREATE TABLE IF NOT EXISTS document_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  extracted_text TEXT,
  summary TEXT,
  analysis_version INTEGER DEFAULT 1,
  ocr_method TEXT,
  extraction_stats JSONB,
  validation_flags JSONB,
  file_hash TEXT,
  processing_duration INTEGER,
  quality_score DECIMAL(3,2),
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure validation_results table exists
CREATE TABLE IF NOT EXISTS validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  property_address_match BOOLEAN DEFAULT FALSE,
  filename_content_consistency BOOLEAN DEFAULT FALSE,
  critical_fields_found JSONB,
  suspicious_patterns JSONB,
  confidence_level DECIMAL(3,2),
  validation_warnings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure lease_clauses table exists
CREATE TABLE IF NOT EXISTS lease_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID,
  building_id UUID,
  clause_type TEXT CHECK (clause_type IN (
    'insurance', 'assignment', 'subletting', 'consents', 'restrictions',
    'alterations', 'pets', 'business_use', 'ground_rent', 'service_charge',
    'repairs', 'notices', 'forfeiture', 'nuisance', 'permitted_use', 'renewals'
  )),
  original_text TEXT,
  ai_summary TEXT,
  interpretation TEXT,
  parties JSONB,
  obligations JSONB,
  permissions JSONB,
  restrictions_data JSONB,
  confidence_score DECIMAL(3,2),
  extraction_method TEXT DEFAULT 'ai_analysis',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure building_lease_summary table exists
CREATE TABLE IF NOT EXISTS building_lease_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID UNIQUE,
  insurance_summary JSONB,
  pets_summary JSONB,
  subletting_summary JSONB,
  alterations_summary JSONB,
  business_use_summary JSONB,
  discrepancies JSONB,
  total_leases INTEGER DEFAULT 0,
  analyzed_leases INTEGER DEFAULT 0,
  last_analysis_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing column to communications_log if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'communications_log'
    AND column_name = 'type'
  ) THEN
    ALTER TABLE communications_log ADD COLUMN type TEXT;
  END IF;
END $$;

-- Create basic indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_analysis_document_id ON document_analysis(document_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_document_id ON validation_results(document_id);
CREATE INDEX IF NOT EXISTS idx_lease_clauses_lease_id ON lease_clauses(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_clauses_building_id ON lease_clauses(building_id);
CREATE INDEX IF NOT EXISTS idx_building_lease_summary_building_id ON building_lease_summary(building_id);

-- Ensure building_compliance_assets table exists for compliance system
CREATE TABLE IF NOT EXISTS building_compliance_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID,
  asset_id UUID,
  status TEXT DEFAULT 'pending',
  last_renewed_date DATE,
  last_carried_out DATE,
  next_due_date DATE,
  notes TEXT,
  inspector_provider TEXT,
  certificate_reference TEXT,
  contractor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure compliance_assets table exists
CREATE TABLE IF NOT EXISTS compliance_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  frequency_months INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Basic RLS policies (simplified for now)
ALTER TABLE document_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_lease_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_compliance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assets ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies that allow access to authenticated users
CREATE POLICY "Authenticated users can access document_analysis" ON document_analysis
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can access validation_results" ON validation_results
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can access lease_clauses" ON lease_clauses
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can access building_lease_summary" ON building_lease_summary
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can access building_compliance_assets" ON building_compliance_assets
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can access compliance_assets" ON compliance_assets
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Add indexes for compliance tables
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_building_id ON building_compliance_assets(building_id);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_asset_id ON building_compliance_assets(asset_id);

COMMIT;