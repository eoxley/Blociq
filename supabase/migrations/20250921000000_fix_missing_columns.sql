-- Fix missing database columns

-- Add unit_id column to leases table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'leases' AND column_name = 'unit_id') THEN
        ALTER TABLE leases ADD COLUMN unit_id UUID REFERENCES units(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON leases(unit_id);
        COMMENT ON COLUMN leases.unit_id IS 'Reference to the specific unit this lease covers';
    END IF;
END $$;

-- Add direction column to communications_log table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'communications_log' AND column_name = 'direction') THEN
        ALTER TABLE communications_log ADD COLUMN direction TEXT CHECK (direction IN ('incoming', 'outgoing')) NOT NULL DEFAULT 'outgoing';
        CREATE INDEX IF NOT EXISTS idx_communications_log_direction ON communications_log(direction);
        COMMENT ON COLUMN communications_log.direction IS 'Direction of communication: incoming or outgoing';
    END IF;
END $$;

-- Add sent_by column to communications_log if it doesn't exist (needed by the API)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'communications_log' AND column_name = 'sent_by') THEN
        ALTER TABLE communications_log ADD COLUMN sent_by UUID REFERENCES users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_communications_log_sent_by ON communications_log(sent_by);
        COMMENT ON COLUMN communications_log.sent_by IS 'User who sent this communication';
    END IF;
END $$;

-- Add content column to communications_log if it doesn't exist (needed by the API)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'communications_log' AND column_name = 'content') THEN
        ALTER TABLE communications_log ADD COLUMN content TEXT;
        COMMENT ON COLUMN communications_log.content IS 'Content/body of the communication';
    END IF;
END $$;

-- Add created_by column to buildings table if it doesn't exist (needed by lease linking API)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'buildings' AND column_name = 'created_by') THEN
        ALTER TABLE buildings ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_buildings_created_by ON buildings(created_by);
        COMMENT ON COLUMN buildings.created_by IS 'User who created this building record';

        -- Set created_by to the first available user for existing buildings
        UPDATE buildings
        SET created_by = (SELECT id FROM auth.users LIMIT 1)
        WHERE created_by IS NULL;
    END IF;
END $$;

-- Add building_id column to document_jobs table if it doesn't exist (needed by portal APIs)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'document_jobs' AND column_name = 'building_id') THEN
        ALTER TABLE document_jobs ADD COLUMN building_id UUID REFERENCES buildings(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_document_jobs_building_id ON document_jobs(building_id);
        COMMENT ON COLUMN document_jobs.building_id IS 'Reference to the building this document relates to';
    END IF;
END $$;

-- Create user_buildings junction table if it doesn't exist (used by RLS policies)
CREATE TABLE IF NOT EXISTS user_buildings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'manager', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, building_id)
);

-- Create indexes for user_buildings
CREATE INDEX IF NOT EXISTS idx_user_buildings_user_id ON user_buildings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_buildings_building_id ON user_buildings(building_id);

-- Create building_access table if it doesn't exist (used by API access control)
CREATE TABLE IF NOT EXISTS building_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'manager', 'viewer')),
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, building_id)
);

-- Create indexes for building_access
CREATE INDEX IF NOT EXISTS idx_building_access_user_id ON building_access(user_id);
CREATE INDEX IF NOT EXISTS idx_building_access_building_id ON building_access(building_id);

-- Populate user_buildings and building_access with current user for existing buildings
DO $$
DECLARE
    first_user_id UUID;
    building_record RECORD;
BEGIN
    -- Get the first available user
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;

    IF first_user_id IS NOT NULL THEN
        -- Add access entries for all existing buildings
        FOR building_record IN SELECT id FROM buildings LOOP
            -- Insert into user_buildings (for RLS)
            INSERT INTO user_buildings (user_id, building_id, role)
            VALUES (first_user_id, building_record.id, 'owner')
            ON CONFLICT (user_id, building_id) DO NOTHING;

            -- Insert into building_access (for API)
            INSERT INTO building_access (user_id, building_id, role, granted_by)
            VALUES (first_user_id, building_record.id, 'owner', first_user_id)
            ON CONFLICT (user_id, building_id) DO NOTHING;
        END LOOP;
    END IF;
END $$;