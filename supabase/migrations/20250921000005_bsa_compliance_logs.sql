-- Building Safety Act (BSA) Golden Thread Compliance Logs
-- Comprehensive audit trail for BSA compliance requirements

-- Create compliance_logs table for Golden Thread
CREATE TABLE IF NOT EXISTS compliance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL,
    document_id UUID,
    compliance_asset_id UUID,

    -- BSA Classification
    document_type VARCHAR(100) NOT NULL,
    compliance_status VARCHAR(50) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,

    -- Audit Trail
    action_type VARCHAR(50) NOT NULL DEFAULT 'document_upload',
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT,

    -- AI Processing
    ai_extraction_raw JSONB NOT NULL DEFAULT '{}',
    ai_summary TEXT,
    ai_confidence INTEGER DEFAULT 0,
    ocr_source VARCHAR(50),

    -- Human Review
    user_confirmed BOOLEAN DEFAULT false,
    user_override JSONB,

    -- Dates
    inspection_date DATE,
    next_due_date DATE,
    date_uploaded TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,

    -- BSA Metadata
    is_golden_thread BOOLEAN DEFAULT false,
    safety_case_linked BOOLEAN DEFAULT false,
    regulator_notified BOOLEAN DEFAULT false,

    -- Findings
    findings TEXT[],
    actions_required TEXT[],
    contractor_details TEXT,

    -- Compliance History
    previous_status VARCHAR(50),
    status_change_reason TEXT
);

-- Update building_compliance_assets to support BSA status enum
DO $$
BEGIN
    -- First, check if we need to update the status column to support new BSA values
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name LIKE '%building_compliance_assets%status%'
        AND check_clause LIKE '%expired%'
    ) THEN
        -- Drop the existing check constraint if it exists
        ALTER TABLE building_compliance_assets DROP CONSTRAINT IF EXISTS building_compliance_assets_status_check;

        -- Add new check constraint with BSA status values
        ALTER TABLE building_compliance_assets ADD CONSTRAINT building_compliance_assets_status_check
        CHECK (status IN (
            'compliant',
            'non_compliant',
            'remedial_action_pending',
            'expired',
            'scheduled',
            'under_review',
            'pending',
            'overdue',
            'upcoming'
        ));
    END IF;

    -- Add HRB indicator if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buildings' AND column_name = 'is_hrb') THEN
        ALTER TABLE buildings ADD COLUMN is_hrb BOOLEAN DEFAULT false;
    END IF;

    -- Add building type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buildings' AND column_name = 'building_type') THEN
        ALTER TABLE buildings ADD COLUMN building_type VARCHAR(100);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Continue if constraints already exist or other errors
        NULL;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_logs_building ON compliance_logs(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_document ON compliance_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_status ON compliance_logs(compliance_status);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_risk ON compliance_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_golden_thread ON compliance_logs(is_golden_thread);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_created ON compliance_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_due_date ON compliance_logs(next_due_date);

-- Enable RLS
ALTER TABLE compliance_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for compliance_logs using agency access pattern
CREATE POLICY "compliance_logs_select_policy" ON compliance_logs
    FOR SELECT USING (
        public.user_has_agency_building_access_uuid(building_id)
    );

CREATE POLICY "compliance_logs_insert_policy" ON compliance_logs
    FOR INSERT WITH CHECK (
        public.user_has_agency_building_access_uuid(building_id)
    );

CREATE POLICY "compliance_logs_update_policy" ON compliance_logs
    FOR UPDATE USING (
        public.user_has_agency_building_access_uuid(building_id)
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON compliance_logs TO authenticated;

-- Create view for Golden Thread compliance overview
CREATE OR REPLACE VIEW golden_thread_compliance AS
SELECT
    cl.*,
    b.name as building_name,
    b.is_hrb,
    b.building_type,
    ca.name as asset_name,
    ca.category as asset_category,
    CASE
        WHEN cl.next_due_date IS NULL THEN 'no_schedule'
        WHEN cl.next_due_date < CURRENT_DATE THEN 'overdue'
        WHEN cl.next_due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
        WHEN cl.next_due_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'upcoming'
        ELSE 'future'
    END as urgency_status,
    CASE
        WHEN cl.risk_level = 'intolerable' THEN 'critical'
        WHEN cl.compliance_status = 'non_compliant' THEN 'high'
        WHEN cl.compliance_status = 'expired' THEN 'high'
        WHEN cl.compliance_status = 'remedial_action_pending' THEN 'medium'
        ELSE 'low'
    END as alert_priority
FROM compliance_logs cl
LEFT JOIN buildings b ON cl.building_id = b.id
LEFT JOIN building_compliance_assets bca ON cl.compliance_asset_id = bca.id
LEFT JOIN compliance_assets ca ON bca.compliance_asset_id = ca.id
WHERE cl.is_golden_thread = true
ORDER BY cl.created_at DESC;

GRANT SELECT ON golden_thread_compliance TO authenticated;

-- Create trigger to auto-update building HRB status based on characteristics
CREATE OR REPLACE FUNCTION auto_update_hrb_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-detect HRB based on Building Safety Act criteria
    IF NEW.total_floors IS NOT NULL AND (
        CAST(NEW.total_floors AS INTEGER) >= 7 OR
        NEW.building_type ILIKE '%residential%' AND CAST(NEW.total_floors AS INTEGER) >= 7 OR
        NEW.building_type ILIKE '%care home%' OR
        NEW.building_type ILIKE '%hospital%'
    ) THEN
        NEW.is_hrb = true;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- If conversion fails, continue without updating
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to buildings table
DROP TRIGGER IF EXISTS trigger_auto_hrb_detection ON buildings;
CREATE TRIGGER trigger_auto_hrb_detection
    BEFORE INSERT OR UPDATE ON buildings
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_hrb_status();

-- Create function to generate BSA compliance report
CREATE OR REPLACE FUNCTION generate_bsa_compliance_report(building_id_param UUID)
RETURNS TABLE (
    document_type TEXT,
    compliance_status TEXT,
    risk_level TEXT,
    last_inspection DATE,
    next_due DATE,
    days_until_due INTEGER,
    urgency_status TEXT,
    findings TEXT[],
    actions_required TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cl.document_type::TEXT,
        cl.compliance_status::TEXT,
        cl.risk_level::TEXT,
        cl.inspection_date,
        cl.next_due_date,
        CASE
            WHEN cl.next_due_date IS NOT NULL
            THEN (cl.next_due_date - CURRENT_DATE)::INTEGER
            ELSE NULL
        END as days_until_due,
        CASE
            WHEN cl.next_due_date IS NULL THEN 'no_schedule'
            WHEN cl.next_due_date < CURRENT_DATE THEN 'overdue'
            WHEN cl.next_due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
            WHEN cl.next_due_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'upcoming'
            ELSE 'future'
        END::TEXT as urgency_status,
        cl.findings,
        cl.actions_required
    FROM compliance_logs cl
    WHERE cl.building_id = building_id_param
    AND cl.created_at = (
        SELECT MAX(created_at)
        FROM compliance_logs cl2
        WHERE cl2.building_id = building_id_param
        AND cl2.document_type = cl.document_type
    )
    ORDER BY
        CASE cl.risk_level
            WHEN 'intolerable' THEN 1
            WHEN 'tolerable' THEN 2
            WHEN 'broadly_acceptable' THEN 3
            ELSE 4
        END,
        cl.next_due_date ASC NULLS LAST;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_bsa_compliance_report(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE compliance_logs IS 'Building Safety Act Golden Thread compliance audit logs';
COMMENT ON COLUMN compliance_logs.is_golden_thread IS 'True for HRB buildings requiring Golden Thread compliance';
COMMENT ON COLUMN compliance_logs.risk_level IS 'BSA risk assessment: intolerable, tolerable, broadly_acceptable, unknown';
COMMENT ON COLUMN compliance_logs.ai_extraction_raw IS 'Complete AI analysis results for audit trail';
COMMENT ON VIEW golden_thread_compliance IS 'Golden Thread compliance overview for BSA reporting';