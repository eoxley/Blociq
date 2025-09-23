-- Fix lease-related database issues
-- This script addresses missing columns and tables causing 409/400/406 errors

-- 1. First, add missing columns to leases table
DO $$
BEGIN
    -- Add analysis_json column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'leases' AND column_name = 'analysis_json'
    ) THEN
        ALTER TABLE leases ADD COLUMN analysis_json JSONB;
        CREATE INDEX IF NOT EXISTS idx_leases_analysis_json ON leases USING gin(analysis_json);
        COMMENT ON COLUMN leases.analysis_json IS 'Structured AI analysis output including clauses, covenants, rights, obligations';
    END IF;

    -- Add scope column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'leases' AND column_name = 'scope'
    ) THEN
        ALTER TABLE leases ADD COLUMN scope TEXT DEFAULT 'unit' CHECK (scope IN ('building', 'unit'));
        CREATE INDEX IF NOT EXISTS idx_leases_scope ON leases(scope);
    END IF;

    -- Add document_job_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'leases' AND column_name = 'document_job_id'
    ) THEN
        ALTER TABLE leases ADD COLUMN document_job_id UUID;
        -- Don't add foreign key constraint in case document_jobs table doesn't exist
        CREATE INDEX IF NOT EXISTS idx_leases_document_job_id ON leases(document_job_id);
    END IF;

    -- Make unit_number nullable if it's currently NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'leases' AND column_name = 'unit_number' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE leases ALTER COLUMN unit_number DROP NOT NULL;
    END IF;

    -- Make leaseholder_name nullable if it's currently NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'leases' AND column_name = 'leaseholder_name' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE leases ALTER COLUMN leaseholder_name DROP NOT NULL;
    END IF;

END $$;

-- 2. Create building_lease_summary table if it doesn't exist
CREATE TABLE IF NOT EXISTS building_lease_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    building_id UUID NOT NULL,
    total_leases INTEGER DEFAULT 0,
    analyzed_leases INTEGER DEFAULT 0,

    -- Insurance summaries
    insurance_landlord_responsible BOOLEAN,
    insurance_tenant_responsible BOOLEAN,
    insurance_shared_responsibility BOOLEAN,
    insurance_details TEXT[],

    -- Pets summaries
    pets_allowed BOOLEAN,
    pets_restricted BOOLEAN,
    pets_prohibited BOOLEAN,
    pets_details TEXT[],

    -- Subletting summaries
    subletting_allowed BOOLEAN,
    subletting_restricted BOOLEAN,
    subletting_prohibited BOOLEAN,
    subletting_details TEXT[],

    -- Alterations summaries
    alterations_allowed BOOLEAN,
    alterations_restricted BOOLEAN,
    alterations_prohibited BOOLEAN,
    alterations_details TEXT[],

    -- Business use summaries
    business_use_allowed BOOLEAN,
    business_use_restricted BOOLEAN,
    business_use_prohibited BOOLEAN,
    business_use_details TEXT[],

    -- Ground rent summaries
    ground_rent_details TEXT[],
    ground_rent_amounts DECIMAL(10,2)[],

    -- Service charge summaries
    service_charge_details TEXT[],
    service_charge_percentages DECIMAL(5,2)[],

    -- Metadata
    last_updated TIMESTAMP DEFAULT NOW(),
    generated_from_leases UUID[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for building_lease_summary
CREATE INDEX IF NOT EXISTS idx_building_lease_summary_building_id ON building_lease_summary(building_id);

-- Add RLS policies for building_lease_summary
ALTER TABLE building_lease_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view building lease summaries for their buildings" ON building_lease_summary
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

CREATE POLICY "Users can insert building lease summaries for their buildings" ON building_lease_summary
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

CREATE POLICY "Users can update building lease summaries for their buildings" ON building_lease_summary
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

-- 3. Enable RLS on leases table if not already enabled
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for leases if they don't exist
DO $$
BEGIN
    -- Check if the policy exists, create if not
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'leases' AND policyname = 'Users can view leases for their buildings'
    ) THEN
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
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'leases' AND policyname = 'Users can insert leases for their buildings'
    ) THEN
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
    END IF;
END $$;

-- 4. Add helpful comments
COMMENT ON TABLE building_lease_summary IS 'Pre-computed summaries of lease analysis data for buildings';
COMMENT ON COLUMN building_lease_summary.building_id IS 'Reference to the building this summary belongs to';
COMMENT ON COLUMN building_lease_summary.generated_from_leases IS 'Array of lease IDs used to generate this summary';

-- 5. Create updated_at trigger for building_lease_summary
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_building_lease_summary_updated_at
  BEFORE UPDATE ON building_lease_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Output status
SELECT 'Database fixes applied successfully' as status;