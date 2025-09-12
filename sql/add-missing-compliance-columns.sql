-- Add missing columns to building_compliance_assets table
-- These columns are required for the compliance asset update functionality

ALTER TABLE building_compliance_assets 
ADD COLUMN IF NOT EXISTS certificate_reference TEXT,
ADD COLUMN IF NOT EXISTS inspector_provider TEXT,
ADD COLUMN IF NOT EXISTS contractor TEXT,
ADD COLUMN IF NOT EXISTS override_reason TEXT,
ADD COLUMN IF NOT EXISTS frequency_months INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN building_compliance_assets.certificate_reference IS 'Reference number or identifier for compliance certificates';
COMMENT ON COLUMN building_compliance_assets.inspector_provider IS 'Name of the inspector or inspection company';
COMMENT ON COLUMN building_compliance_assets.contractor IS 'Contractor responsible for compliance work';
COMMENT ON COLUMN building_compliance_assets.override_reason IS 'Reason for overriding default compliance schedules';
COMMENT ON COLUMN building_compliance_assets.frequency_months IS 'Custom frequency in months for compliance checks';

-- Verify the columns were added
\d building_compliance_assets;