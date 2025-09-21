-- Update leases table to support lease analysis storage and linking
-- This migration enhances the leases table to store AI analysis results and support building/unit linking

-- First, let's add the new columns to support the requirements
ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS apportionment DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS analysis_json JSONB,
  ADD COLUMN IF NOT EXISTS document_job_id UUID REFERENCES document_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'unit' CHECK (scope IN ('building', 'unit'));

-- Make unit_number nullable since building-level leases won't have a specific unit
ALTER TABLE leases ALTER COLUMN unit_number DROP NOT NULL;

-- Make leaseholder_name nullable for building-level leases
ALTER TABLE leases ALTER COLUMN leaseholder_name DROP NOT NULL;

-- Update service_charge_percentage to be nullable and rename to match apportionment
ALTER TABLE leases RENAME COLUMN service_charge_percentage TO service_charge_apportionment;
ALTER TABLE leases ALTER COLUMN service_charge_apportionment DROP NOT NULL;

-- Add a composite unique constraint to prevent duplicate leases for the same unit
ALTER TABLE leases ADD CONSTRAINT unique_unit_lease
  UNIQUE NULLS NOT DISTINCT (building_id, unit_id, scope);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leases_building_id ON leases(building_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_scope ON leases(scope);
CREATE INDEX IF NOT EXISTS idx_leases_document_job_id ON leases(document_job_id);
CREATE INDEX IF NOT EXISTS idx_leases_analysis_json ON leases USING gin(analysis_json);

-- Add RLS policies
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

-- Policy for users to see leases for buildings they have access to
CREATE POLICY "Users can view leases for their buildings" ON leases
  FOR SELECT USING (
    building_id IN (
      SELECT b.id FROM buildings b
      WHERE b.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM building_access ba
        WHERE ba.building_id = b.id
        AND ba.user_id = auth.uid()
      )
    )
  );

-- Policy for users to insert leases for buildings they have access to
CREATE POLICY "Users can insert leases for their buildings" ON leases
  FOR INSERT WITH CHECK (
    building_id IN (
      SELECT b.id FROM buildings b
      WHERE b.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM building_access ba
        WHERE ba.building_id = b.id
        AND ba.user_id = auth.uid()
        AND ba.role IN ('owner', 'manager')
      )
    )
  );

-- Policy for users to update leases for buildings they have access to
CREATE POLICY "Users can update leases for their buildings" ON leases
  FOR UPDATE USING (
    building_id IN (
      SELECT b.id FROM buildings b
      WHERE b.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM building_access ba
        WHERE ba.building_id = b.id
        AND ba.user_id = auth.uid()
        AND ba.role IN ('owner', 'manager')
      )
    )
  );

-- Policy for users to delete leases for buildings they have access to
CREATE POLICY "Users can delete leases for their buildings" ON leases
  FOR DELETE USING (
    building_id IN (
      SELECT b.id FROM buildings b
      WHERE b.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM building_access ba
        WHERE ba.building_id = b.id
        AND ba.user_id = auth.uid()
        AND ba.role IN ('owner', 'manager')
      )
    )
  );

-- Update the updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leases_updated_at
  BEFORE UPDATE ON leases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE leases IS 'Stores lease agreements with AI analysis results, supporting both building-level and unit-level scope';
COMMENT ON COLUMN leases.scope IS 'Defines whether lease applies to entire building or specific unit';
COMMENT ON COLUMN leases.unit_id IS 'Optional reference to specific unit, null for building-level leases';
COMMENT ON COLUMN leases.analysis_json IS 'Structured AI analysis output including clauses, covenants, rights, obligations';
COMMENT ON COLUMN leases.apportionment IS 'Service charge apportionment percentage for the unit';
COMMENT ON COLUMN leases.document_job_id IS 'Links to the document processing job that generated this lease record';