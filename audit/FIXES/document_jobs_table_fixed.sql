-- Create document_jobs table for the new document lab system
-- This table is required for compliance-lab, general-docs-lab, and major-works-lab

BEGIN;

-- Create document_jobs table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('QUEUED', 'OCR', 'EXTRACT', 'SUMMARISE', 'READY', 'FAILED')),
    size_bytes BIGINT NOT NULL,
    mime TEXT NOT NULL,
    page_count INTEGER,
    doc_type_guess TEXT,
    linked_building_id UUID,
    linked_unit_id UUID,
    error_code TEXT,
    error_message TEXT,
    summary_json JSONB,
    user_id UUID NOT NULL,
    agency_id UUID,
    doc_category TEXT NOT NULL CHECK (doc_category IN ('compliance', 'general', 'major-works', 'lease')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_jobs_user_id ON document_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_document_jobs_agency_id ON document_jobs(agency_id);
CREATE INDEX IF NOT EXISTS idx_document_jobs_doc_category ON document_jobs(doc_category);
CREATE INDEX IF NOT EXISTS idx_document_jobs_status ON document_jobs(status);
CREATE INDEX IF NOT EXISTS idx_document_jobs_created_at ON document_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_document_jobs_linked_building_id ON document_jobs(linked_building_id);

-- Add comments for documentation
COMMENT ON TABLE document_jobs IS 'Jobs for document processing in the new document lab system';
COMMENT ON COLUMN document_jobs.doc_category IS 'Category of document: compliance, general, major-works, lease';
COMMENT ON COLUMN document_jobs.status IS 'Processing status: QUEUED, OCR, EXTRACT, SUMMARISE, READY, FAILED';
COMMENT ON COLUMN document_jobs.summary_json IS 'AI-generated summary and analysis results';
COMMENT ON COLUMN document_jobs.linked_building_id IS 'Optional link to a specific building';
COMMENT ON COLUMN document_jobs.linked_unit_id IS 'Optional link to a specific unit';

-- Create building_compliance_assets table if it doesn't exist
CREATE TABLE IF NOT EXISTS building_compliance_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL,
    compliance_asset_id UUID,
    status TEXT NOT NULL CHECK (status IN ('compliant', 'overdue', 'upcoming', 'not_applied', 'pending')) DEFAULT 'not_applied',
    due_date TIMESTAMP WITH TIME ZONE,
    next_due_date TIMESTAMP WITH TIME ZONE,
    last_renewed_date TIMESTAMP WITH TIME ZONE,
    last_carried_out TIMESTAMP WITH TIME ZONE,
    document_id UUID,
    notes TEXT,
    contractor TEXT,
    inspector_provider TEXT,
    certificate_reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for building_compliance_assets
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_building_id ON building_compliance_assets(building_id);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_status ON building_compliance_assets(status);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_due_date ON building_compliance_assets(due_date);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_next_due_date ON building_compliance_assets(next_due_date);

-- Add comments
COMMENT ON TABLE building_compliance_assets IS 'Compliance assets and their status for each building';
COMMENT ON COLUMN building_compliance_assets.status IS 'Compliance status: compliant, overdue, upcoming, not_applied, pending';

-- Create compliance_assets table if it doesn't exist (referenced by building_compliance_assets)
CREATE TABLE IF NOT EXISTS compliance_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    frequency_months INTEGER NOT NULL DEFAULT 12,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for compliance_assets
CREATE INDEX IF NOT EXISTS idx_compliance_assets_category ON compliance_assets(category);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_name ON compliance_assets(name);

-- Add comments
COMMENT ON TABLE compliance_assets IS 'Master list of compliance asset types (EICR, Fire Safety, etc.)';
COMMENT ON COLUMN compliance_assets.frequency_months IS 'How often this compliance check is required (in months)';

-- Insert default compliance assets if table is empty
INSERT INTO compliance_assets (name, category, description, frequency_months)
SELECT * FROM (VALUES
    ('EICR (Electrical Installation Condition Report)', 'Electrical Safety', 'Electrical safety inspection required for rental properties', 60),
    ('Fire Risk Assessment', 'Fire Safety', 'Assessment of fire safety risks and mitigation measures', 12),
    ('Gas Safety Certificate', 'Gas Safety', 'Annual gas appliance safety check', 12),
    ('PAT Testing', 'Electrical Safety', 'Portable Appliance Testing for electrical equipment', 12),
    ('Fire Alarm Service', 'Fire Safety', 'Maintenance and testing of fire alarm systems', 6),
    ('Emergency Lighting Test', 'Fire Safety', 'Testing of emergency lighting systems', 6),
    ('Fire Door Inspection', 'Fire Safety', 'Inspection of fire doors and their operation', 12),
    ('Water Hygiene Assessment', 'Water Safety', 'Legionella risk assessment and water system inspection', 24),
    ('Asbestos Survey', 'Health & Safety', 'Survey for asbestos-containing materials', 36),
    ('Building Insurance', 'Insurance', 'Building insurance policy coverage', 12)
) AS defaults(name, category, description, frequency_months)
WHERE NOT EXISTS (SELECT 1 FROM compliance_assets LIMIT 1);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to automatically update updated_at
CREATE TRIGGER update_document_jobs_updated_at
    BEFORE UPDATE ON document_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_building_compliance_assets_updated_at
    BEFORE UPDATE ON building_compliance_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_assets_updated_at
    BEFORE UPDATE ON compliance_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Show success message
DO $$
BEGIN
    RAISE NOTICE 'Document lab tables created successfully!';
    RAISE NOTICE 'Created tables: document_jobs, building_compliance_assets, compliance_assets';
    RAISE NOTICE 'Added indexes and triggers for automatic timestamp updates';
    RAISE NOTICE 'Note: RLS policies were omitted to avoid auth dependency issues';
END $$;