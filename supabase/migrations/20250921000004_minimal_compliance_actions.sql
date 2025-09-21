-- Minimal compliance_actions table without dependencies
-- Run this first if other tables don't exist yet

CREATE TABLE IF NOT EXISTS compliance_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_compliance_asset_id UUID NOT NULL,
    building_id UUID NOT NULL,
    document_id UUID,
    action_description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    responsible_party VARCHAR(255) NOT NULL DEFAULT 'Management Company',
    due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    source VARCHAR(50) NOT NULL DEFAULT 'document_analysis',
    compliance_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    notes TEXT
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_compliance_actions_building ON compliance_actions(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_actions_status ON compliance_actions(status);
CREATE INDEX IF NOT EXISTS idx_compliance_actions_priority ON compliance_actions(priority);

-- Enable RLS
ALTER TABLE compliance_actions ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy - allow all for authenticated users for now
CREATE POLICY "compliance_actions_all_authenticated" ON compliance_actions
    FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON compliance_actions TO authenticated;

COMMENT ON TABLE compliance_actions IS 'Minimal compliance actions table for document analysis integration';