-- Create compliance_actions table for tracking compliance action items
-- This table stores actions required from compliance document analysis

CREATE TABLE IF NOT EXISTS compliance_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    building_compliance_asset_id UUID NOT NULL REFERENCES building_compliance_assets(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    document_id UUID REFERENCES compliance_documents(id) ON DELETE SET NULL,

    -- Action details
    action_description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'high', 'medium', 'low'
    responsible_party VARCHAR(255) NOT NULL DEFAULT 'Management Company',
    due_date DATE,

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    source VARCHAR(50) NOT NULL DEFAULT 'document_analysis', -- 'document_analysis', 'manual', 'inspection'

    -- Compliance context
    compliance_status VARCHAR(50), -- 'Fail', 'Unsatisfactory', 'Action Required', etc.

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    assigned_to UUID,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID,

    -- Notes and comments
    notes TEXT,
    completion_notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_actions_asset ON compliance_actions(building_compliance_asset_id);
CREATE INDEX IF NOT EXISTS idx_compliance_actions_building ON compliance_actions(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_actions_document ON compliance_actions(document_id);
CREATE INDEX IF NOT EXISTS idx_compliance_actions_status ON compliance_actions(status);
CREATE INDEX IF NOT EXISTS idx_compliance_actions_priority ON compliance_actions(priority);
CREATE INDEX IF NOT EXISTS idx_compliance_actions_due_date ON compliance_actions(due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_actions_created ON compliance_actions(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_compliance_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_compliance_actions_updated_at ON compliance_actions;
CREATE TRIGGER trigger_compliance_actions_updated_at
    BEFORE UPDATE ON compliance_actions
    FOR EACH ROW
    EXECUTE FUNCTION update_compliance_actions_updated_at();

-- Add RLS (Row Level Security)
ALTER TABLE compliance_actions ENABLE ROW LEVEL SECURITY;

-- RLS policies for compliance_actions using agency access pattern
CREATE POLICY "compliance_actions_select_policy" ON compliance_actions
    FOR SELECT USING (
        public.user_has_agency_building_access_uuid(building_id)
    );

CREATE POLICY "compliance_actions_insert_policy" ON compliance_actions
    FOR INSERT WITH CHECK (
        public.user_has_agency_building_access_uuid(building_id)
    );

CREATE POLICY "compliance_actions_update_policy" ON compliance_actions
    FOR UPDATE USING (
        public.user_has_agency_building_access_uuid(building_id)
    );

CREATE POLICY "compliance_actions_delete_policy" ON compliance_actions
    FOR DELETE USING (
        public.user_has_agency_building_access_uuid(building_id)
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_actions TO authenticated;

-- Add useful view for compliance actions with context
-- Note: This view will be created after compliance_documents table exists
CREATE OR REPLACE VIEW compliance_actions_with_context AS
SELECT
    ca.*,
    bca.status as asset_status,
    bca.next_due_date as asset_next_due,
    cas.name as asset_name,
    cas.category as asset_category,
    b.name as building_name,
    COALESCE(cd.original_filename, cd.file_path, 'Unknown') as document_filename,
    cd.document_type,
    CASE
        WHEN ca.due_date IS NULL THEN 'no_deadline'
        WHEN ca.due_date < CURRENT_DATE THEN 'overdue'
        WHEN ca.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_this_week'
        WHEN ca.due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_this_month'
        ELSE 'future'
    END as urgency_status
FROM compliance_actions ca
JOIN building_compliance_assets bca ON ca.building_compliance_asset_id = bca.id
LEFT JOIN compliance_assets cas ON bca.compliance_asset_id = cas.id
LEFT JOIN buildings b ON ca.building_id = b.id
LEFT JOIN compliance_documents cd ON ca.document_id = cd.id;

GRANT SELECT ON compliance_actions_with_context TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE compliance_actions IS 'Tracks action items generated from compliance document analysis and manual inspections';
COMMENT ON COLUMN compliance_actions.action_description IS 'Description of the action required';
COMMENT ON COLUMN compliance_actions.priority IS 'Priority level: high, medium, low';
COMMENT ON COLUMN compliance_actions.responsible_party IS 'Who is responsible for completing this action';
COMMENT ON COLUMN compliance_actions.source IS 'How this action was created: document_analysis, manual, inspection';
COMMENT ON COLUMN compliance_actions.compliance_status IS 'The compliance status that triggered this action';