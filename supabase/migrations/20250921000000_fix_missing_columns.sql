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