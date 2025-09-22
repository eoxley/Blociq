-- ========================================
-- ADD COMPLIANCE ALERTS TABLE AND OUTLOOK EVENT ID FIELD
-- ========================================

-- Create compliance_alerts table if it doesn't exist
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  compliance_asset_id UUID REFERENCES compliance_assets(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('immediate_danger', 'potentially_dangerous', 'improvement_required', 'further_investigation')),
  alert_message TEXT NOT NULL,
  finding_details JSONB,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('immediate', 'urgent', 'high', 'medium', 'low')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add outlook_event_id to building_compliance_assets if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'building_compliance_assets'
        AND column_name = 'outlook_event_id'
    ) THEN
        ALTER TABLE building_compliance_assets
        ADD COLUMN outlook_event_id VARCHAR(255);
    END IF;
END $$;

-- Add missing columns to building_compliance_assets if they don't exist
DO $$
BEGIN
    -- Add last_completed_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'building_compliance_assets'
        AND column_name = 'last_completed_date'
    ) THEN
        ALTER TABLE building_compliance_assets
        ADD COLUMN last_completed_date DATE;
    END IF;

    -- Add document_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'building_compliance_assets'
        AND column_name = 'document_id'
    ) THEN
        ALTER TABLE building_compliance_assets
        ADD COLUMN document_id UUID;
    END IF;

    -- Add contractor
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'building_compliance_assets'
        AND column_name = 'contractor'
    ) THEN
        ALTER TABLE building_compliance_assets
        ADD COLUMN contractor VARCHAR(255);
    END IF;

    -- Update the existing asset_id reference to compliance_asset_id for clarity
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'building_compliance_assets'
        AND column_name = 'asset_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'building_compliance_assets'
        AND column_name = 'compliance_asset_id'
    ) THEN
        ALTER TABLE building_compliance_assets
        RENAME COLUMN asset_id TO compliance_asset_id;
    END IF;
END $$;

-- Create indexes for compliance_alerts
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_building_id ON compliance_alerts(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_compliance_asset_id ON compliance_alerts(compliance_asset_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_status ON compliance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_priority ON compliance_alerts(priority);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_created_at ON compliance_alerts(created_at);

-- Create index for outlook_event_id
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_outlook_event_id ON building_compliance_assets(outlook_event_id);

-- Add trigger for updated_at on compliance_alerts
CREATE TRIGGER update_compliance_alerts_updated_at
    BEFORE UPDATE ON compliance_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for compliance_alerts
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view alerts for buildings in their agency
CREATE POLICY "Users can view compliance alerts for their agency buildings" ON compliance_alerts
  FOR SELECT USING (
    building_id IN (
      SELECT id FROM buildings
      WHERE agency_id = (
        SELECT agency_id FROM profiles
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can insert alerts for buildings in their agency
CREATE POLICY "Users can create compliance alerts for their agency buildings" ON compliance_alerts
  FOR INSERT WITH CHECK (
    building_id IN (
      SELECT id FROM buildings
      WHERE agency_id = (
        SELECT agency_id FROM profiles
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update alerts for buildings in their agency
CREATE POLICY "Users can update compliance alerts for their agency buildings" ON compliance_alerts
  FOR UPDATE USING (
    building_id IN (
      SELECT id FROM buildings
      WHERE agency_id = (
        SELECT agency_id FROM profiles
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can delete alerts for buildings in their agency
CREATE POLICY "Users can delete compliance alerts for their agency buildings" ON compliance_alerts
  FOR DELETE USING (
    building_id IN (
      SELECT id FROM buildings
      WHERE agency_id = (
        SELECT agency_id FROM profiles
        WHERE user_id = auth.uid()
      )
    )
  );