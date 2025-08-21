-- Fix Compliance System Schema Issues
-- This migration resolves column name conflicts and data inconsistencies

BEGIN;

-- 1. Fix compliance_assets table column names
DO $$
DECLARE
    name_col_exists BOOLEAN;
    title_col_exists BOOLEAN;
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
        ALTER TABLE compliance_assets RENAME COLUMN name TO title;
        RAISE NOTICE 'Renamed column "name" to "title" in compliance_assets table';
    END IF;
    
    -- If both columns exist, merge them
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
END $$;

-- 2. Fix building_compliance_assets table column names
DO $$
DECLARE
    asset_id_col_exists BOOLEAN;
    compliance_asset_id_col_exists BOOLEAN;
BEGIN
    -- Check if 'asset_id' column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_compliance_assets' 
        AND column_name = 'asset_id'
    ) INTO asset_id_col_exists;
    
    -- Check if 'compliance_asset_id' column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_compliance_assets' 
        AND column_name = 'compliance_asset_id'
    ) INTO compliance_asset_id_col_exists;
    
    -- If 'asset_id' exists and 'compliance_asset_id' doesn't, rename it
    IF asset_id_col_exists AND NOT compliance_asset_id_col_exists THEN
        ALTER TABLE building_compliance_assets RENAME COLUMN asset_id TO compliance_asset_id;
        RAISE NOTICE 'Renamed column "asset_id" to "compliance_asset_id" in building_compliance_assets table';
    END IF;
    
    -- If both columns exist, merge them
    IF asset_id_col_exists AND compliance_asset_id_col_exists THEN
        -- Copy data from 'asset_id' to 'compliance_asset_id' where 'compliance_asset_id' is null
        UPDATE building_compliance_assets 
        SET compliance_asset_id = asset_id 
        WHERE compliance_asset_id IS NULL;
        
        -- Drop the 'asset_id' column
        ALTER TABLE building_compliance_assets DROP COLUMN asset_id;
        RAISE NOTICE 'Merged data from "asset_id" to "compliance_asset_id" and dropped "asset_id" column';
    END IF;
    
    -- If neither column exists, create 'compliance_asset_id' column
    IF NOT asset_id_col_exists AND NOT compliance_asset_id_col_exists THEN
        ALTER TABLE building_compliance_assets ADD COLUMN compliance_asset_id UUID;
        RAISE NOTICE 'Added "compliance_asset_id" column to building_compliance_assets table';
    END IF;
    
    -- Ensure 'compliance_asset_id' column is NOT NULL
    ALTER TABLE building_compliance_assets ALTER COLUMN compliance_asset_id SET NOT NULL;
END $$;

-- 3. Add missing columns to building_compliance_assets
ALTER TABLE building_compliance_assets 
ADD COLUMN IF NOT EXISTS frequency_months INTEGER,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS contractor TEXT,
ADD COLUMN IF NOT EXISTS status_override TEXT,
ADD COLUMN IF NOT EXISTS last_completed_date DATE;

-- 4. Fix status values to match expected enum
UPDATE building_compliance_assets 
SET status = 'pending' 
WHERE status IS NULL 
   OR status NOT IN ('compliant', 'pending', 'overdue', 'unknown');

-- 5. Add proper constraints
DO $$
BEGIN
    -- Add CHECK constraint for status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'building_compliance_assets_status_check' 
        AND conrelid = 'building_compliance_assets'::regclass
    ) THEN
        ALTER TABLE building_compliance_assets ADD CONSTRAINT building_compliance_assets_status_check 
            CHECK (status IN ('compliant', 'pending', 'overdue', 'unknown'));
    END IF;
    
    -- Add UNIQUE constraint for building_id, compliance_asset_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'building_compliance_assets_building_id_compliance_asset_id_key' 
        AND conrelid = 'building_compliance_assets'::regclass
    ) THEN
        ALTER TABLE building_compliance_assets ADD CONSTRAINT building_compliance_assets_building_id_compliance_asset_id_key 
            UNIQUE (building_id, compliance_asset_id);
    END IF;
END $$;

-- 6. Fix foreign key constraints
DO $$
BEGIN
    -- Drop existing constraints if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'building_compliance_assets_building_id_fkey' 
        AND table_name = 'building_compliance_assets'
    ) THEN
        ALTER TABLE building_compliance_assets DROP CONSTRAINT building_compliance_assets_building_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'building_compliance_assets_compliance_asset_id_fkey' 
        AND table_name = 'building_compliance_assets'
    ) THEN
        ALTER TABLE building_compliance_assets DROP CONSTRAINT building_compliance_assets_compliance_asset_id_fkey;
    END IF;
    
    -- Add the correct foreign key constraints
    ALTER TABLE building_compliance_assets ADD CONSTRAINT building_compliance_assets_building_id_fkey 
        FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE;
    
    ALTER TABLE building_compliance_assets ADD CONSTRAINT building_compliance_assets_compliance_asset_id_fkey 
        FOREIGN KEY (compliance_asset_id) REFERENCES compliance_assets(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed foreign key constraints for building_compliance_assets table';
END $$;

-- 7. Create or update indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_assets_title ON compliance_assets(title);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_category ON compliance_assets(category);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_building_id ON building_compliance_assets(building_id);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_compliance_asset_id ON building_compliance_assets(compliance_asset_id);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_status ON building_compliance_assets(status);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_next_due_date ON building_compliance_assets(next_due_date);

-- 8. Ensure RLS is enabled and policies exist
ALTER TABLE compliance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_compliance_assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON compliance_assets;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON building_compliance_assets;

-- Create new policies
CREATE POLICY "Allow all operations for authenticated users" ON compliance_assets 
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON building_compliance_assets 
    FOR ALL USING (auth.role() = 'authenticated');

COMMIT;
