-- Fix compliance_assets table missing title column
-- This migration ensures the compliance_assets table has the correct title column

-- Check and create compliance_assets table if it doesn't exist
CREATE TABLE IF NOT EXISTS compliance_assets (
    id BIGSERIAL PRIMARY KEY,
    category TEXT NOT NULL DEFAULT 'General',
    title TEXT NOT NULL DEFAULT 'Unknown Asset',
    name TEXT, -- Legacy column for backwards compatibility
    description TEXT,
    frequency_months INTEGER DEFAULT 12,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add title column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE compliance_assets ADD COLUMN title TEXT;
        RAISE NOTICE 'Added title column to compliance_assets';
    END IF;
END $$;

-- Migrate data from 'name' to 'title' if needed
DO $$
BEGIN
    -- If both name and title columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'compliance_assets' AND column_name = 'name') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'compliance_assets' AND column_name = 'title') THEN
        -- Copy data from name to title where title is empty
        UPDATE compliance_assets 
        SET title = name 
        WHERE (title IS NULL OR title = '') AND name IS NOT NULL AND name != '';
        
        RAISE NOTICE 'Migrated data from name to title column';
    END IF;
END $$;

-- Set title as NOT NULL with a default
ALTER TABLE compliance_assets ALTER COLUMN title SET NOT NULL;
ALTER TABLE compliance_assets ALTER COLUMN title SET DEFAULT 'Unknown Asset';

-- Ensure we have basic compliance assets with titles
INSERT INTO compliance_assets (title, category, description, frequency_months, is_required) VALUES
('Fire Risk Assessment', 'Fire Safety', 'Comprehensive fire safety assessment of the building', 12, true),
('Fire Alarm Testing', 'Fire Safety', 'Regular testing of fire alarm systems', 1, true),
('Emergency Lighting', 'Fire Safety', 'Testing of emergency lighting systems', 6, true),
('Gas Safety Certificate', 'Gas Safety', 'Annual gas safety inspection and certification', 12, true),
('Electrical Installation Condition Report', 'Electrical', 'Periodic electrical safety inspection', 60, true),
('Lift Maintenance Certificate', 'Lifts', 'Regular lift maintenance and safety certification', 6, true),
('Legionella Risk Assessment', 'Water', 'Assessment of water systems for legionella risk', 12, true),
('Asbestos Management Survey', 'Asbestos', 'Survey and management plan for asbestos', 60, true),
('Energy Performance Certificate', 'Energy', 'Building energy efficiency assessment', 120, true),
('Building Insurance Certificate', 'Insurance', 'Proof of building insurance coverage', 12, true)
ON CONFLICT (title, category) DO NOTHING;

-- Create index on title if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_compliance_assets_title ON compliance_assets(title);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_category ON compliance_assets(category);

-- Update any existing records that might have null or empty titles
UPDATE compliance_assets 
SET title = CASE 
    WHEN category = 'Fire Safety' AND (title IS NULL OR title = '' OR title = 'Unknown Asset') THEN 'Fire Risk Assessment'
    WHEN category = 'Gas Safety' AND (title IS NULL OR title = '' OR title = 'Unknown Asset') THEN 'Gas Safety Certificate'
    WHEN category = 'Electrical' AND (title IS NULL OR title = '' OR title = 'Unknown Asset') THEN 'Electrical Installation Condition Report'
    WHEN category = 'Lifts' AND (title IS NULL OR title = '' OR title = 'Unknown Asset') THEN 'Lift Maintenance Certificate'
    WHEN category = 'Water' AND (title IS NULL OR title = '' OR title = 'Unknown Asset') THEN 'Legionella Risk Assessment'
    WHEN category = 'Asbestos' AND (title IS NULL OR title = '' OR title = 'Unknown Asset') THEN 'Asbestos Management Survey'
    WHEN category = 'Energy' AND (title IS NULL OR title = '' OR title = 'Unknown Asset') THEN 'Energy Performance Certificate'
    WHEN category = 'Insurance' AND (title IS NULL OR title = '' OR title = 'Unknown Asset') THEN 'Building Insurance Certificate'
    ELSE COALESCE(title, category || ' Asset')
END
WHERE title IS NULL OR title = '' OR title = 'Unknown Asset';

-- Verify the fix
SELECT 
    'compliance_assets' as table_name,
    COUNT(*) as total_assets,
    COUNT(CASE WHEN title IS NOT NULL AND title != '' THEN 1 END) as assets_with_title,
    COUNT(CASE WHEN title IS NULL OR title = '' THEN 1 END) as assets_without_title
FROM compliance_assets;