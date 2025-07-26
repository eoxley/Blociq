-- Enhance BlocIQ Compliance System
-- This migration adds comprehensive compliance tracking capabilities

-- Add additional fields to compliance_assets table
ALTER TABLE compliance_assets
ADD COLUMN IF NOT EXISTS required_if TEXT DEFAULT 'always',
ADD COLUMN IF NOT EXISTS default_frequency TEXT DEFAULT '1 year',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS legal_requirement BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS guidance_notes TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add additional fields to building_compliance_assets table
ALTER TABLE building_compliance_assets
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS contractor_id UUID REFERENCES contractors(id),
ADD COLUMN IF NOT EXISTS cost_estimate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS last_inspection_date DATE,
ADD COLUMN IF NOT EXISTS next_inspection_date DATE,
ADD COLUMN IF NOT EXISTS inspection_frequency TEXT,
ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS exemption_reason TEXT,
ADD COLUMN IF NOT EXISTS exemption_granted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS exemption_granted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS auto_reminders BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create compliance_reminders table
CREATE TABLE IF NOT EXISTS compliance_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES compliance_assets(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('due_soon', 'overdue', 'custom')),
    reminder_date DATE NOT NULL,
    message TEXT,
    sent_to UUID REFERENCES auth.users(id),
    sent_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled'))
);

-- Create compliance_audit_log table
CREATE TABLE IF NOT EXISTS compliance_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES compliance_assets(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed', 'document_uploaded', 'reminder_sent')),
    old_value JSONB,
    new_value JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Create compliance_reports table
CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('monthly', 'quarterly', 'annual', 'custom')),
    report_date DATE NOT NULL,
    generated_by UUID REFERENCES auth.users(id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    report_data JSONB,
    file_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'archived'))
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_compliance_assets_category ON compliance_assets(category);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_required_if ON compliance_assets(required_if);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_priority ON compliance_assets(priority);

CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_status ON building_compliance_assets(status);

-- Add missing next_due_date column to building_compliance_assets table
ALTER TABLE building_compliance_assets
ADD COLUMN IF NOT EXISTS next_due_date DATE;

CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_next_due_date ON building_compliance_assets(next_due_date);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_assigned_to ON building_compliance_assets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_risk_level ON building_compliance_assets(risk_level);

CREATE INDEX IF NOT EXISTS idx_compliance_reminders_building_asset ON compliance_reminders(building_id, asset_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reminders_date ON compliance_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_compliance_reminders_status ON compliance_reminders(status);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_log_building_asset ON compliance_audit_log(building_id, asset_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_log_changed_at ON compliance_audit_log(changed_at);

CREATE INDEX IF NOT EXISTS idx_compliance_reports_building_date ON compliance_reports(building_id, report_date);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_type ON compliance_reports(report_type);

-- Create views for easier querying
CREATE OR REPLACE VIEW compliance_overview AS
SELECT 
    b.id as building_id,
    b.name as building_name,
    ca.id as asset_id,
    ca.name as asset_name,
    ca.category,
    ca.required_if,
    ca.default_frequency,
    ca.priority,
    bca.status,
    bca.next_due_date,
    bca.notes,
    bca.risk_level,
    bca.assigned_to,
    bca.last_updated,
    CASE 
        WHEN bca.next_due_date IS NULL THEN 'Missing'
        WHEN bca.next_due_date < CURRENT_DATE THEN 'Overdue'
        WHEN bca.next_due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Due Soon'
        ELSE 'Compliant'
    END as compliance_status,
    CASE 
        WHEN bca.next_due_date IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM (bca.next_due_date - CURRENT_DATE))
    END as days_until_due
FROM buildings b
CROSS JOIN compliance_assets ca
LEFT JOIN building_compliance_assets bca ON b.id = bca.building_id AND ca.id = bca.asset_id
ORDER BY b.name, ca.category, ca.name;

-- Create view for overdue items
CREATE OR REPLACE VIEW compliance_overdue AS
SELECT * FROM compliance_overview 
WHERE compliance_status IN ('Overdue', 'Due Soon')
ORDER BY days_until_due ASC;

-- Create view for building compliance summary
CREATE OR REPLACE VIEW building_compliance_summary AS
SELECT 
    building_id,
    building_name,
    COUNT(*) as total_assets,
    COUNT(CASE WHEN compliance_status = 'Compliant' THEN 1 END) as compliant_count,
    COUNT(CASE WHEN compliance_status = 'Overdue' THEN 1 END) as overdue_count,
    COUNT(CASE WHEN compliance_status = 'Due Soon' THEN 1 END) as due_soon_count,
    COUNT(CASE WHEN compliance_status = 'Missing' THEN 1 END) as missing_count,
    ROUND(
        (COUNT(CASE WHEN compliance_status = 'Compliant' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as compliance_percentage
FROM compliance_overview
GROUP BY building_id, building_name
ORDER BY compliance_percentage ASC;

-- Create functions for compliance management
CREATE OR REPLACE FUNCTION update_compliance_status(
    p_building_id INTEGER,
    p_asset_id UUID,
    p_status TEXT,
    p_next_due_date DATE DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    old_record RECORD;
    new_record RECORD;
BEGIN
    -- Get old record for audit log
    SELECT * INTO old_record 
    FROM building_compliance_assets 
    WHERE building_id = p_building_id AND asset_id = p_asset_id;
    
    -- Upsert the record
    INSERT INTO building_compliance_assets (
        building_id, asset_id, status, next_due_date, notes, last_updated
    ) VALUES (
        p_building_id, p_asset_id, p_status, p_next_due_date, p_notes, NOW()
    )
    ON CONFLICT (building_id, asset_id) 
    DO UPDATE SET 
        status = EXCLUDED.status,
        next_due_date = EXCLUDED.next_due_date,
        notes = EXCLUDED.notes,
        last_updated = NOW()
    RETURNING * INTO new_record;
    
    -- Log the change
    INSERT INTO compliance_audit_log (
        building_id, asset_id, action, old_value, new_value, changed_by
    ) VALUES (
        p_building_id, 
        p_asset_id, 
        CASE 
            WHEN old_record.id IS NULL THEN 'created'
            ELSE 'updated'
        END,
        CASE WHEN old_record.id IS NOT NULL THEN to_jsonb(old_record) END,
        to_jsonb(new_record),
        p_user_id
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate compliance reminders
CREATE OR REPLACE FUNCTION generate_compliance_reminders()
RETURNS INTEGER AS $$
DECLARE
    reminder_count INTEGER := 0;
    reminder_record RECORD;
BEGIN
    -- Generate reminders for items due within reminder_days
    FOR reminder_record IN 
        SELECT 
            bca.building_id,
            bca.asset_id,
            bca.reminder_days,
            bca.next_due_date,
            b.name as building_name,
            ca.name as asset_name
        FROM building_compliance_assets bca
        JOIN buildings b ON b.id = bca.building_id
        JOIN compliance_assets ca ON ca.id = bca.asset_id
        WHERE bca.auto_reminders = TRUE
        AND bca.next_due_date IS NOT NULL
        AND bca.next_due_date <= CURRENT_DATE + (bca.reminder_days || ' days')::INTERVAL
        AND bca.next_due_date > CURRENT_DATE
        AND NOT EXISTS (
            SELECT 1 FROM compliance_reminders cr 
            WHERE cr.building_id = bca.building_id 
            AND cr.asset_id = bca.asset_id 
            AND cr.reminder_date = CURRENT_DATE
        )
    LOOP
        INSERT INTO compliance_reminders (
            building_id, asset_id, reminder_type, reminder_date, message, created_by
        ) VALUES (
            reminder_record.building_id,
            reminder_record.asset_id,
            'due_soon',
            CURRENT_DATE,
            format('Compliance item "%s" for %s is due on %s', 
                   reminder_record.asset_name, 
                   reminder_record.building_name, 
                   reminder_record.next_due_date),
            NULL
        );
        
        reminder_count := reminder_count + 1;
    END LOOP;
    
    -- Generate overdue reminders
    FOR reminder_record IN 
        SELECT 
            bca.building_id,
            bca.asset_id,
            b.name as building_name,
            ca.name as asset_name,
            bca.next_due_date
        FROM building_compliance_assets bca
        JOIN buildings b ON b.id = bca.building_id
        JOIN compliance_assets ca ON ca.id = bca.asset_id
        WHERE bca.next_due_date IS NOT NULL
        AND bca.next_due_date < CURRENT_DATE
        AND NOT EXISTS (
            SELECT 1 FROM compliance_reminders cr 
            WHERE cr.building_id = bca.building_id 
            AND cr.asset_id = bca.asset_id 
            AND cr.reminder_type = 'overdue'
            AND cr.reminder_date = CURRENT_DATE
        )
    LOOP
        INSERT INTO compliance_reminders (
            building_id, asset_id, reminder_type, reminder_date, message, created_by
        ) VALUES (
            reminder_record.building_id,
            reminder_record.asset_id,
            'overdue',
            CURRENT_DATE,
            format('Compliance item "%s" for %s is OVERDUE since %s', 
                   reminder_record.asset_name, 
                   reminder_record.building_name, 
                   reminder_record.next_due_date),
            NULL
        );
        
        reminder_count := reminder_count + 1;
    END LOOP;
    
    RETURN reminder_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get compliance statistics for a building
CREATE OR REPLACE FUNCTION get_building_compliance_stats(p_building_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'building_id', p_building_id,
        'total_assets', COUNT(*),
        'compliant', COUNT(CASE WHEN compliance_status = 'Compliant' THEN 1 END),
        'overdue', COUNT(CASE WHEN compliance_status = 'Overdue' THEN 1 END),
        'due_soon', COUNT(CASE WHEN compliance_status = 'Due Soon' THEN 1 END),
        'missing', COUNT(CASE WHEN compliance_status = 'Missing' THEN 1 END),
        'compliance_percentage', ROUND(
            (COUNT(CASE WHEN compliance_status = 'Compliant' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
        ),
        'categories', json_object_agg(
            category, 
            json_build_object(
                'total', COUNT(*),
                'compliant', COUNT(CASE WHEN compliance_status = 'Compliant' THEN 1 END),
                'overdue', COUNT(CASE WHEN compliance_status = 'Overdue' THEN 1 END),
                'due_soon', COUNT(CASE WHEN compliance_status = 'Due Soon' THEN 1 END)
            )
        )
    ) INTO result
    FROM compliance_overview
    WHERE building_id = p_building_id
    GROUP BY building_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies
ALTER TABLE compliance_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;

-- Users can view compliance data for buildings they have access to
CREATE POLICY "Users can view compliance reminders" ON compliance_reminders
    FOR SELECT USING (true);

CREATE POLICY "Users can view compliance audit log" ON compliance_audit_log
    FOR SELECT USING (true);

CREATE POLICY "Users can view compliance reports" ON compliance_reports
    FOR SELECT USING (true);

-- Users can insert/update compliance data
CREATE POLICY "Users can manage compliance reminders" ON compliance_reminders
    FOR ALL USING (true);

CREATE POLICY "Users can manage compliance audit log" ON compliance_audit_log
    FOR ALL USING (true);

CREATE POLICY "Users can manage compliance reports" ON compliance_reports
    FOR ALL USING (true);

-- Add comments for documentation
COMMENT ON TABLE compliance_reminders IS 'Stores compliance reminders for tracking and notification purposes';
COMMENT ON TABLE compliance_audit_log IS 'Audit trail for all compliance-related changes';
COMMENT ON TABLE compliance_reports IS 'Generated compliance reports for buildings';
COMMENT ON FUNCTION update_compliance_status IS 'Updates compliance status with audit logging';
COMMENT ON FUNCTION generate_compliance_reminders IS 'Generates automatic compliance reminders';
COMMENT ON FUNCTION get_building_compliance_stats IS 'Returns comprehensive compliance statistics for a building';
COMMENT ON VIEW compliance_overview IS 'Comprehensive view of all compliance items across buildings';
COMMENT ON VIEW compliance_overdue IS 'View of overdue and due soon compliance items';
COMMENT ON VIEW building_compliance_summary IS 'Summary statistics for each building compliance status'; 