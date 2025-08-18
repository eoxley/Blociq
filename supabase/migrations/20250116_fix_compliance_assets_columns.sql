-- Fix compliance_assets table column names
-- This migration corrects the column name mismatch between 'name' and 'title'

-- First, check if the 'name' column exists and has data
DO $$
DECLARE
    name_col_exists BOOLEAN;
    title_col_exists BOOLEAN;
    name_data_count INTEGER;
BEGIN
    -- Check if 'name' column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'name'
    ) INTO name_col_exists;
    
    -- Check if 'title' column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'title'
    ) INTO title_col_exists;
    
    -- If 'name' column exists and 'title' doesn't, rename it
    IF name_col_exists AND NOT title_col_exists THEN
        -- Rename 'name' column to 'title'
        ALTER TABLE compliance_assets RENAME COLUMN name TO title;
        RAISE NOTICE 'Renamed column "name" to "title" in compliance_assets table';
    END IF;
    
    -- If both columns exist, we need to merge them
    IF name_col_exists AND title_col_exists THEN
        -- Copy data from 'name' to 'title' where 'title' is null
        UPDATE compliance_assets 
        SET title = name 
        WHERE title IS NULL OR title = '';
        
        -- Drop the 'name' column
        ALTER TABLE compliance_assets DROP COLUMN name;
        RAISE NOTICE 'Merged data from "name" to "title" and dropped "name" column';
    END IF;
    
    -- If neither column exists, create 'title' column
    IF NOT name_col_exists AND NOT title_col_exists THEN
        ALTER TABLE compliance_assets ADD COLUMN title VARCHAR(255);
        RAISE NOTICE 'Added "title" column to compliance_assets table';
    END IF;
    
    -- Ensure 'title' column is NOT NULL
    ALTER TABLE compliance_assets ALTER COLUMN title SET NOT NULL;
    
    -- Add index on title column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'compliance_assets' 
        AND indexname = 'idx_compliance_assets_title'
    ) THEN
        CREATE INDEX idx_compliance_assets_title ON compliance_assets(title);
    END IF;
    
END $$;

-- Now fix the data that was inserted with wrong column names
-- Update any records that might have been inserted with wrong column structure
UPDATE compliance_assets 
SET title = 'Fire Risk Assessment'
WHERE title IS NULL OR title = '' AND category = 'Fire Safety';

UPDATE compliance_assets 
SET title = 'Fire Alarm Testing'
WHERE title IS NULL OR title = '' AND category = 'Fire Safety';

UPDATE compliance_assets 
SET title = 'Emergency Lighting'
WHERE title IS NULL OR title = '' AND category = 'Fire Safety';

UPDATE compliance_assets 
SET title = 'Gas Safety Certificate'
WHERE title IS NULL OR title = '' AND category = 'Gas Safety';

UPDATE compliance_assets 
SET title = 'Electrical Installation Condition Report'
WHERE title IS NULL OR title = '' AND category = 'Electrical';

UPDATE compliance_assets 
SET title = 'Lift Maintenance Certificate'
WHERE title IS NULL OR title = '' AND category = 'Lifts';

UPDATE compliance_assets 
SET title = 'Legionella Risk Assessment'
WHERE title IS NULL OR title = '' AND category = 'Water';

UPDATE compliance_assets 
SET title = 'Asbestos Management Survey'
WHERE title IS NULL OR title = '' AND category = 'Asbestos';

UPDATE compliance_assets 
SET title = 'Energy Performance Certificate'
WHERE title IS NULL OR title = '' AND category = 'Energy';

UPDATE compliance_assets 
SET title = 'Building Insurance Certificate'
WHERE title IS NULL OR title = '' AND category = 'Insurance';

-- Ensure we have the basic compliance assets
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

-- Verify the fix
SELECT 
    'compliance_assets' as table_name,
    COUNT(*) as total_assets,
    COUNT(CASE WHEN title IS NOT NULL AND title != '' THEN 1 END) as assets_with_title,
    COUNT(CASE WHEN title IS NULL OR title = '' THEN 1 END) as assets_without_title
FROM compliance_assets;
