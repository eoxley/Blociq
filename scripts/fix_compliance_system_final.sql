-- Final Compliance System Fix
-- This script addresses the remaining issues identified in the audit

BEGIN;

-- Step 1: Verify and fix compliance_assets table structure
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Ensure title column exists and is correct
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'title'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        RAISE NOTICE 'Creating title column in compliance_assets...';
        ALTER TABLE compliance_assets ADD COLUMN title VARCHAR(255);
        
        -- Copy data from name if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'compliance_assets' 
            AND column_name = 'name'
        ) THEN
            UPDATE compliance_assets SET title = name WHERE title IS NULL;
            ALTER TABLE compliance_assets DROP COLUMN name;
        END IF;
        
        ALTER TABLE compliance_assets ALTER COLUMN title SET NOT NULL;
    END IF;
    
    -- Ensure category column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE compliance_assets ADD COLUMN category VARCHAR(100) DEFAULT 'Other';
        ALTER TABLE compliance_assets ALTER COLUMN category SET NOT NULL;
    END IF;
    
    -- Ensure description column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE compliance_assets ADD COLUMN description TEXT;
    END IF;
    
    -- Ensure frequency_months column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'frequency_months'
    ) THEN
        ALTER TABLE compliance_assets ADD COLUMN frequency_months INTEGER DEFAULT 12;
    END IF;
    
    RAISE NOTICE 'compliance_assets table structure verified and fixed';
END $$;

-- Step 2: Verify and fix building_compliance_assets table structure
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    -- Ensure compliance_asset_id column exists and is correct
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_compliance_assets' 
        AND column_name = 'compliance_asset_id'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        RAISE NOTICE 'Creating compliance_asset_id column in building_compliance_assets...';
        ALTER TABLE building_compliance_assets ADD COLUMN compliance_asset_id UUID;
        
        -- Copy data from asset_id if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'building_compliance_assets' 
            AND column_name = 'asset_id'
        ) THEN
            UPDATE building_compliance_assets SET compliance_asset_id = asset_id WHERE compliance_asset_id IS NULL;
            ALTER TABLE building_compliance_assets DROP COLUMN asset_id;
        END IF;
        
        ALTER TABLE building_compliance_assets ALTER COLUMN compliance_asset_id SET NOT NULL;
    END IF;
    
    -- Ensure building_id column exists and is correct type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_compliance_assets' 
        AND column_name = 'building_id'
    ) THEN
        ALTER TABLE building_compliance_assets ADD COLUMN building_id UUID;
    END IF;
    
    -- Ensure status column exists with correct values
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_compliance_assets' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE building_compliance_assets ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
    END IF;
    
    -- Fix status values to match expected enum
    UPDATE building_compliance_assets 
    SET status = 'pending' 
    WHERE status IS NULL 
       OR status NOT IN ('compliant', 'pending', 'overdue', 'due_soon');
    
    RAISE NOTICE 'building_compliance_assets table structure verified and fixed';
END $$;

-- Step 3: Ensure foreign key constraints exist
DO $$
BEGIN
    -- Add building_id foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'building_compliance_assets_building_id_fkey' 
        AND table_name = 'building_compliance_assets'
    ) THEN
        ALTER TABLE building_compliance_assets 
        ADD CONSTRAINT building_compliance_assets_building_id_fkey 
        FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE;
    END IF;
    
    -- Add compliance_asset_id foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'building_compliance_assets_compliance_asset_id_fkey' 
        AND table_name = 'building_compliance_assets'
    ) THEN
        ALTER TABLE building_compliance_assets 
        ADD CONSTRAINT building_compliance_assets_compliance_asset_id_fkey 
        FOREIGN KEY (compliance_asset_id) REFERENCES compliance_assets(id) ON DELETE CASCADE;
    END IF;
    
    RAISE NOTICE 'Foreign key constraints verified and added if needed';
END $$;

-- Step 4: Create or update indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_assets_title ON compliance_assets(title);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_category ON compliance_assets(category);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_building_id ON building_compliance_assets(building_id);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_compliance_asset_id ON building_compliance_assets(compliance_asset_id);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_status ON building_compliance_assets(status);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_next_due_date ON building_compliance_assets(next_due_date);

-- Step 5: Ensure unique constraint exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'building_compliance_assets_building_id_compliance_asset_id_key' 
        AND conrelid = 'building_compliance_assets'::regclass
    ) THEN
        ALTER TABLE building_compliance_assets 
        ADD CONSTRAINT building_compliance_assets_building_id_compliance_asset_id_key 
        UNIQUE (building_id, compliance_asset_id);
    END IF;
    
    RAISE NOTICE 'Unique constraints verified and added if needed';
END $$;

-- Step 6: Add missing columns that might be needed by the UI
DO $$
BEGIN
    -- Add next_due_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_compliance_assets' 
        AND column_name = 'next_due_date'
    ) THEN
        ALTER TABLE building_compliance_assets ADD COLUMN next_due_date DATE;
    END IF;
    
    -- Add last_renewed_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_compliance_assets' 
        AND column_name = 'last_renewed_date'
    ) THEN
        ALTER TABLE building_compliance_assets ADD COLUMN last_renewed_date DATE;
    END IF;
    
    -- Add notes if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_compliance_assets' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE building_compliance_assets ADD COLUMN notes TEXT;
    END IF;
    
    -- Add contractor if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_compliance_assets' 
        AND column_name = 'contractor'
    ) THEN
        ALTER TABLE building_compliance_assets ADD COLUMN contractor TEXT;
    END IF;
    
    -- Add frequency_months if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_compliance_assets' 
        AND column_name = 'frequency_months'
    ) THEN
        ALTER TABLE building_compliance_assets ADD COLUMN frequency_months INTEGER DEFAULT 12;
    END IF;
    
    RAISE NOTICE 'Additional columns added if needed';
END $$;

-- Step 7: Verify the system is working
DO $$
DECLARE
    asset_count INTEGER;
    building_asset_count INTEGER;
    building_count INTEGER;
BEGIN
    -- Count records in each table
    SELECT COUNT(*) INTO asset_count FROM compliance_assets;
    SELECT COUNT(*) INTO building_asset_count FROM building_compliance_assets;
    SELECT COUNT(*) INTO building_count FROM buildings;
    
    RAISE NOTICE 'System verification:';
    RAISE NOTICE '- compliance_assets: % records', asset_count;
    RAISE NOTICE '- building_compliance_assets: % records', building_asset_count;
    RAISE NOTICE '- buildings: % records', building_count;
    
    IF asset_count = 0 THEN
        RAISE WARNING 'No compliance assets found - the system may need initial data';
    END IF;
    
    IF building_count = 0 THEN
        RAISE WARNING 'No buildings found - check building data';
    END IF;
END $$;

COMMIT;

-- Final status
SELECT 'Compliance system fix completed successfully' as status;
