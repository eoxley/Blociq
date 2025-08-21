-- Fix Compliance Schema Conflicts
-- This migration resolves the conflicting column names between different migration files
-- It checks the actual current state and fixes accordingly

BEGIN;

-- Step 1: Check and fix compliance_assets table structure
DO $$
DECLARE
    name_col_exists BOOLEAN;
    title_col_exists BOOLEAN;
    current_column_name TEXT;
BEGIN
    -- Check what columns actually exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'name'
    ) INTO name_col_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'title'
    ) INTO title_col_exists;
    
    -- Determine which column name to use
    IF name_col_exists AND title_col_exists THEN
        -- Both exist - merge them
        RAISE NOTICE 'Both name and title columns exist - merging data...';
        
        -- Copy data from name to title where title is null
        UPDATE compliance_assets 
        SET title = name 
        WHERE title IS NULL OR title = '';
        
        -- Drop the name column
        ALTER TABLE compliance_assets DROP COLUMN name;
        RAISE NOTICE 'Merged data and dropped name column';
        
    ELSIF name_col_exists AND NOT title_col_exists THEN
        -- Only name exists - rename to title
        RAISE NOTICE 'Only name column exists - renaming to title...';
        ALTER TABLE compliance_assets RENAME COLUMN name TO title;
        
    ELSIF NOT name_col_exists AND NOT title_col_exists THEN
        -- Neither exists - create title column
        RAISE NOTICE 'Neither column exists - creating title column...';
        ALTER TABLE compliance_assets ADD COLUMN title VARCHAR(255);
        
    ELSE
        -- Title column already exists and is correct
        RAISE NOTICE 'Title column already exists and is correct';
    END IF;
    
    -- Ensure title column is NOT NULL
    ALTER TABLE compliance_assets ALTER COLUMN title SET NOT NULL;
    
    -- Add missing columns if they don't exist
    ALTER TABLE compliance_assets 
    ADD COLUMN IF NOT EXISTS category VARCHAR(100),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS frequency_months INTEGER,
    ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    -- Ensure category is NOT NULL
    ALTER TABLE compliance_assets ALTER COLUMN category SET NOT NULL;
    
END $$;

-- Step 2: Check and fix building_compliance_assets table structure
DO $$
DECLARE
    asset_id_col_exists BOOLEAN;
    compliance_asset_id_col_exists BOOLEAN;
BEGIN
    -- Check what columns actually exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_compliance_assets' 
        AND column_name = 'asset_id'
    ) INTO asset_id_col_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_compliance_assets' 
        AND column_name = 'compliance_asset_id'
    ) INTO compliance_asset_id_col_exists;
    
    -- Fix column names
    IF asset_id_col_exists AND NOT compliance_asset_id_col_exists THEN
        -- Only asset_id exists - rename to compliance_asset_id
        RAISE NOTICE 'Renaming asset_id to compliance_asset_id...';
        ALTER TABLE building_compliance_assets RENAME COLUMN asset_id TO compliance_asset_id;
        
    ELSIF asset_id_col_exists AND compliance_asset_id_col_exists THEN
        -- Both exist - merge them
        RAISE NOTICE 'Both columns exist - merging data...';
        UPDATE building_compliance_assets 
        SET compliance_asset_id = asset_id 
        WHERE compliance_asset_id IS NULL;
        ALTER TABLE building_compliance_assets DROP COLUMN asset_id;
        
    ELSIF NOT asset_id_col_exists AND NOT compliance_asset_id_col_exists THEN
        -- Neither exists - create compliance_asset_id column
        RAISE NOTICE 'Creating compliance_asset_id column...';
        ALTER TABLE building_compliance_assets ADD COLUMN compliance_asset_id UUID;
    END IF;
    
    -- Ensure compliance_asset_id is NOT NULL
    ALTER TABLE building_compliance_assets ALTER COLUMN compliance_asset_id SET NOT NULL;
    
    -- Add missing columns if they don't exist
    ALTER TABLE building_compliance_assets 
    ADD COLUMN IF NOT EXISTS building_id UUID,
    ADD COLUMN IF NOT EXISTS last_renewed_date DATE,
    ADD COLUMN IF NOT EXISTS next_due_date DATE,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS status_override TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS contractor TEXT,
    ADD COLUMN IF NOT EXISTS frequency_months INTEGER,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    -- Ensure building_id is NOT NULL
    ALTER TABLE building_compliance_assets ALTER COLUMN building_id SET NOT NULL;
    
    -- Fix status values to match expected enum
    UPDATE building_compliance_assets 
    SET status = 'pending' 
    WHERE status IS NULL 
       OR status NOT IN ('compliant', 'pending', 'overdue', 'unknown');
    
END $$;

-- Step 3: Fix foreign key constraints
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
    
    RAISE NOTICE 'Fixed foreign key constraints';
END $$;

-- Step 4: Add proper constraints and indexes
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

-- Step 5: Create or update indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_assets_title ON compliance_assets(title);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_category ON compliance_assets(category);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_building_id ON building_compliance_assets(building_id);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_compliance_asset_id ON building_compliance_assets(compliance_asset_id);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_status ON building_compliance_assets(status);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_next_due_date ON building_compliance_assets(next_due_date);

-- Step 6: Ensure RLS is enabled and policies exist
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

-- Step 7: Insert sample compliance assets if table is empty
DO $$
DECLARE
    asset_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO asset_count FROM compliance_assets;
    
    IF asset_count = 0 THEN
        RAISE NOTICE 'Compliance assets table is empty - inserting sample data...';
        
        INSERT INTO compliance_assets (title, category, description, frequency_months, is_required) VALUES
        ('Fire Risk Assessment', 'Legal & Safety', 'Annual fire safety assessment required by law', 12, true),
        ('Gas Safety Certificate', 'Legal & Safety', 'Annual gas safety inspection certificate', 12, true),
        ('Electrical Installation Certificate', 'Legal & Safety', 'EICR certificate every 5 years', 60, true),
        ('Asbestos Survey', 'Structural & Condition', 'Asbestos survey and management plan', 120, false),
        ('Lift Inspection', 'Operational & Contracts', 'Annual lift safety inspection', 12, false),
        ('Energy Performance Certificate', 'Legal & Safety', 'EPC certificate every 10 years', 120, true),
        ('Building Insurance', 'Insurance', 'Annual building insurance renewal', 12, true),
        ('Service Charge Accounts', 'Admin', 'Annual service charge accounts preparation', 12, true),
        ('Leaseholder Consultation', 'Lease & Documentation', 'Section 20 consultation for major works', 0, false),
        ('Health & Safety Policy', 'Legal & Safety', 'Annual health and safety policy review', 12, true);
        
        RAISE NOTICE 'Inserted % sample compliance assets', asset_count + 10;
    ELSE
        RAISE NOTICE 'Compliance assets table already has % records', asset_count;
    END IF;
END $$;

COMMIT;
