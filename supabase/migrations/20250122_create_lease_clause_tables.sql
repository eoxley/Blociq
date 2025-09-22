-- Create lease clause tracking tables for structured lease analysis
-- This enables detailed clause indexing and building-level aggregation

BEGIN;

-- Create lease_clauses table for storing structured clause data
CREATE TABLE IF NOT EXISTS lease_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,

  -- Clause categorization
  clause_type TEXT NOT NULL CHECK (clause_type IN (
    'insurance', 'assignment', 'subletting', 'consents', 'restrictions',
    'alterations', 'pets', 'business_use', 'ground_rent', 'service_charge',
    'repairs', 'notices', 'forfeiture', 'nuisance', 'permitted_use', 'renewals'
  )),

  -- Clause content
  original_text TEXT,
  ai_summary TEXT,
  interpretation TEXT,

  -- Structured data
  parties JSONB, -- {leaseholder, landlord, freeholder}
  obligations JSONB, -- structured obligations
  permissions JSONB, -- what's allowed/permitted
  restrictions_data JSONB, -- what's restricted/forbidden

  -- Metadata
  confidence_score DECIMAL(3,2), -- AI confidence in interpretation
  extraction_method TEXT DEFAULT 'ai_analysis',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create building_lease_summary table for aggregated building-wide rules
CREATE TABLE IF NOT EXISTS building_lease_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE UNIQUE,

  -- Aggregated clause summaries by type
  insurance_summary JSONB, -- who insures, obligations
  pets_summary JSONB, -- pets allowed/forbidden with lease references
  subletting_summary JSONB, -- subletting rules across leases
  alterations_summary JSONB, -- alteration consent requirements
  business_use_summary JSONB, -- business use permissions

  -- Discrepancy tracking
  discrepancies JSONB, -- where leases differ on key points

  -- Statistics
  total_leases INTEGER DEFAULT 0,
  analyzed_leases INTEGER DEFAULT 0,
  last_analysis_date TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lease_clauses_lease_id ON lease_clauses(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_clauses_building_id ON lease_clauses(building_id);
CREATE INDEX IF NOT EXISTS idx_lease_clauses_type ON lease_clauses(clause_type);
CREATE INDEX IF NOT EXISTS idx_building_lease_summary_building_id ON building_lease_summary(building_id);

-- Enable Row Level Security
ALTER TABLE lease_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_lease_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lease_clauses
CREATE POLICY "Users can view lease clauses for buildings they have access to" ON lease_clauses
  FOR SELECT USING (
    building_id IN (
      SELECT building_id FROM building_access
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'manager', 'agent')
    )
    OR
    building_id IN (
      SELECT id FROM buildings WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert lease clauses for buildings they manage" ON lease_clauses
  FOR INSERT WITH CHECK (
    building_id IN (
      SELECT building_id FROM building_access
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'manager')
    )
    OR
    building_id IN (
      SELECT id FROM buildings WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update lease clauses for buildings they manage" ON lease_clauses
  FOR UPDATE USING (
    building_id IN (
      SELECT building_id FROM building_access
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'manager')
    )
    OR
    building_id IN (
      SELECT id FROM buildings WHERE created_by = auth.uid()
    )
  );

-- Create RLS policies for building_lease_summary
CREATE POLICY "Users can view building lease summaries for buildings they have access to" ON building_lease_summary
  FOR SELECT USING (
    building_id IN (
      SELECT building_id FROM building_access
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'manager', 'agent')
    )
    OR
    building_id IN (
      SELECT id FROM buildings WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can upsert building lease summaries for buildings they manage" ON building_lease_summary
  FOR ALL USING (
    building_id IN (
      SELECT building_id FROM building_access
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'manager')
    )
    OR
    building_id IN (
      SELECT id FROM buildings WHERE created_by = auth.uid()
    )
  );

-- Create function to update building lease summary when clauses change
CREATE OR REPLACE FUNCTION update_building_lease_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the building_lease_summary when lease_clauses are modified
  INSERT INTO building_lease_summary (building_id, last_analysis_date)
  VALUES (
    COALESCE(NEW.building_id, OLD.building_id),
    NOW()
  )
  ON CONFLICT (building_id)
  DO UPDATE SET
    last_analysis_date = NOW(),
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update building summaries
CREATE TRIGGER update_building_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON lease_clauses
  FOR EACH ROW
  EXECUTE FUNCTION update_building_lease_summary();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lease_clause_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_lease_clauses_updated_at
  BEFORE UPDATE ON lease_clauses
  FOR EACH ROW
  EXECUTE FUNCTION update_lease_clause_updated_at();

CREATE TRIGGER update_building_lease_summary_updated_at
  BEFORE UPDATE ON building_lease_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_lease_clause_updated_at();

COMMIT;