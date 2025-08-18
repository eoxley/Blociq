-- Migration: Add generated normalisation columns for compliance assets
-- Date: 2025-01-18
-- Description: Simple migration to add generated columns for deduplication

-- Add normalisation columns as generated columns for deduplication
-- These will be automatically computed from title and category
DO $$
BEGIN
    -- Check if norm_title column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'norm_title'
    ) THEN
        ALTER TABLE compliance_assets 
        ADD COLUMN norm_title VARCHAR(255) GENERATED ALWAYS AS (
            LOWER(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(
                        COALESCE(title, ''), 
                        '[^a-zA-Z0-9\s]', ' ', 'g'
                    ), 
                    '\s+', ' '
                )
            )
        ) STORED;
        RAISE NOTICE 'Added norm_title generated column';
    ELSE
        RAISE NOTICE 'norm_title column already exists';
    END IF;
    
    -- Check if norm_category column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'norm_category'
    ) THEN
        ALTER TABLE compliance_assets 
        ADD COLUMN norm_category VARCHAR(255) GENERATED ALWAYS AS (
            LOWER(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(
                        COALESCE(category, ''), 
                        '[^a-zA-Z0-9\s]', ' ', 'g'
                    ), 
                    '\s+', ' '
                )
            )
        ) STORED;
        RAISE NOTICE 'Added norm_category generated column';
    ELSE
        RAISE NOTICE 'norm_category column already exists';
    END IF;
END $$;

-- Create unique constraint to prevent duplicates
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_norm_asset'
    ) THEN
        -- Try to add the constraint
        ALTER TABLE compliance_assets 
        ADD CONSTRAINT unique_norm_asset UNIQUE (norm_category, norm_title);
        RAISE NOTICE 'Added unique constraint on (norm_category, norm_title)';
    ELSE
        RAISE NOTICE 'Constraint unique_norm_asset already exists';
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_assets_norm_title ON compliance_assets(norm_title);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_norm_category ON compliance_assets(norm_category);

-- Add comments for documentation
COMMENT ON COLUMN compliance_assets.norm_title IS 'Generated column for deduplication (lowercase, no special chars)';
COMMENT ON COLUMN compliance_assets.norm_category IS 'Generated column for deduplication (lowercase, no special chars)';
COMMENT ON CONSTRAINT unique_norm_asset ON compliance_assets IS 'Prevents duplicate compliance assets based on normalised category and title';

-- Verify the migration
DO $$
DECLARE
    total_assets INTEGER;
    assets_with_norm INTEGER;
    constraint_exists BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO total_assets FROM compliance_assets;
    SELECT COUNT(*) INTO assets_with_norm FROM compliance_assets WHERE norm_title IS NOT NULL AND norm_category IS NOT NULL;
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_norm_asset'
    ) INTO constraint_exists;
    
    RAISE NOTICE 'Migration complete:';
    RAISE NOTICE '- Total assets: %', total_assets;
    RAISE NOTICE '- Assets with normalisation: %', assets_with_norm;
    RAISE NOTICE '- Unique constraint exists: %', constraint_exists;
    
    IF total_assets != assets_with_norm THEN
        RAISE WARNING 'Some assets may not have been normalised properly';
    END IF;
    
    IF NOT constraint_exists THEN
        RAISE WARNING 'Unique constraint was not created - duplicates may still be possible';
    END IF;
END $$;
