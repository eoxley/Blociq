-- Migration: Add compliance assets deduplication columns
-- Date: 2025-01-18
-- Description: Adds normalisation columns and constraints to prevent duplicate compliance assets

-- Add normalisation columns for deduplication
ALTER TABLE compliance_assets 
ADD COLUMN IF NOT EXISTS norm_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS norm_category VARCHAR(255);

-- Create unique constraint to prevent duplicates
-- This will fail if there are existing duplicates that need to be resolved first
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_norm_asset'
    ) THEN
        -- Try to add the constraint
        BEGIN
            ALTER TABLE compliance_assets 
            ADD CONSTRAINT unique_norm_asset UNIQUE (norm_category, norm_title);
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'Constraint unique_norm_asset already exists';
        END;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_assets_norm_title ON compliance_assets(norm_title);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_norm_category ON compliance_assets(norm_category);

-- Populate existing data with normalised values
-- This uses a simple normalisation approach that can be enhanced later
UPDATE compliance_assets 
SET 
    norm_title = LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                COALESCE(title, ''), 
                '[^a-zA-Z0-9\s]', ' ', 'g'
            ), 
            '\s+', ' '
        )
    ),
    norm_category = LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                COALESCE(category, ''), 
                '[^a-zA-Z0-9\s]', ' ', 'g'
            ), 
            '\s+', ' '
        )
    )
WHERE norm_title IS NULL OR norm_category IS NULL;

-- Make the normalisation columns NOT NULL after populating
ALTER TABLE compliance_assets 
ALTER COLUMN norm_title SET NOT NULL,
ALTER COLUMN norm_category SET NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN compliance_assets.norm_title IS 'Normalised title for deduplication (lowercase, no special chars)';
COMMENT ON COLUMN compliance_assets.norm_category IS 'Normalised category for deduplication (lowercase, no special chars)';
COMMENT ON CONSTRAINT unique_norm_asset ON compliance_assets IS 'Prevents duplicate compliance assets based on normalised category and title';

-- Verify the migration
DO $$
DECLARE
    total_assets INTEGER;
    assets_with_norm INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_assets FROM compliance_assets;
    SELECT COUNT(*) INTO assets_with_norm FROM compliance_assets WHERE norm_title IS NOT NULL AND norm_category IS NOT NULL;
    
    RAISE NOTICE 'Migration complete: % assets processed, % have normalisation data', total_assets, assets_with_norm;
    
    IF total_assets != assets_with_norm THEN
        RAISE WARNING 'Some assets may not have been normalised properly';
    END IF;
END $$;
