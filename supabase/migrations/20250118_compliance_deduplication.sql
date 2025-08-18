-- Migration: Add compliance assets deduplication constraints
-- Date: 2025-01-18
-- Description: Adds constraints to prevent duplicate compliance assets using existing generated columns

-- Check if the normalisation columns exist and are generated
DO $$
DECLARE
    norm_title_exists BOOLEAN;
    norm_category_exists BOOLEAN;
    norm_title_generated BOOLEAN;
    norm_category_generated BOOLEAN;
BEGIN
    -- Check if columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'norm_title'
    ) INTO norm_title_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'norm_category'
    ) INTO norm_category_exists;
    
    -- Check if they are generated columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'norm_title'
        AND is_generated = 'ALWAYS'
    ) INTO norm_title_generated;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'norm_category'
        AND is_generated = 'ALWAYS'
    ) INTO norm_category_generated;
    
    IF norm_title_exists AND norm_category_exists THEN
        RAISE NOTICE 'Normalisation columns already exist';
        
        IF norm_title_generated AND norm_category_generated THEN
            RAISE NOTICE 'Columns are generated - no need to populate data';
        ELSE
            RAISE NOTICE 'Columns are not generated - they may need manual population';
        END IF;
    ELSE
        RAISE NOTICE 'Normalisation columns do not exist - they may need to be created';
    END IF;
END $$;

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
            RAISE NOTICE 'Added unique constraint on (norm_category, norm_title)';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'Constraint unique_norm_asset already exists';
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Failed to add constraint: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Constraint unique_norm_asset already exists';
    END IF;
END $$;

-- Create indexes for performance (if columns exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'norm_title'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_compliance_assets_norm_title ON compliance_assets(norm_title);
        RAISE NOTICE 'Created index on norm_title';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'norm_category'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_compliance_assets_norm_category ON compliance_assets(norm_category);
        RAISE NOTICE 'Created index on norm_category';
    END IF;
END $$;

-- Add comments for documentation
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'norm_title'
    ) THEN
        COMMENT ON COLUMN compliance_assets.norm_title IS 'Generated column for deduplication (lowercase, no special chars)';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'norm_category'
    ) THEN
        COMMENT ON COLUMN compliance_assets.norm_category IS 'Generated column for deduplication (lowercase, no special chars)';
    END IF;
END $$;

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
