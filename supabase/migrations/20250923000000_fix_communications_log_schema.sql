-- Fix communications_log table schema to support building and leaseholder relationships
-- This addresses the foreign key relationship errors in the building page

-- Add missing columns to communications_log if they don't exist
DO $$
BEGIN
    -- Add building_id column with foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communications_log' AND column_name = 'building_id'
    ) THEN
        ALTER TABLE communications_log
        ADD COLUMN building_id UUID REFERENCES buildings(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_communications_log_building_id
        ON communications_log(building_id);

        COMMENT ON COLUMN communications_log.building_id
        IS 'Reference to the building this communication relates to';
    END IF;

    -- Add leaseholder_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communications_log' AND column_name = 'leaseholder_id'
    ) THEN
        ALTER TABLE communications_log
        ADD COLUMN leaseholder_id UUID REFERENCES leaseholders(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_communications_log_leaseholder_id
        ON communications_log(leaseholder_id);

        COMMENT ON COLUMN communications_log.leaseholder_id
        IS 'Reference to the leaseholder this communication relates to';
    END IF;

    -- Add other missing columns that the UI expects
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communications_log' AND column_name = 'building_name'
    ) THEN
        ALTER TABLE communications_log
        ADD COLUMN building_name TEXT;

        COMMENT ON COLUMN communications_log.building_name
        IS 'Cached building name for quick reference';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communications_log' AND column_name = 'unit_number'
    ) THEN
        ALTER TABLE communications_log
        ADD COLUMN unit_number TEXT;

        COMMENT ON COLUMN communications_log.unit_number
        IS 'Unit number this communication relates to';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communications_log' AND column_name = 'sent_by'
    ) THEN
        ALTER TABLE communications_log
        ADD COLUMN sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_communications_log_sent_by
        ON communications_log(sent_by);

        COMMENT ON COLUMN communications_log.sent_by
        IS 'User who sent this communication';
    END IF;

    -- Add content column if missing (UI expects this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communications_log' AND column_name = 'content'
    ) THEN
        ALTER TABLE communications_log
        ADD COLUMN content TEXT;

        COMMENT ON COLUMN communications_log.content
        IS 'Content/body of the communication';
    END IF;

    -- Add subject column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communications_log' AND column_name = 'subject'
    ) THEN
        ALTER TABLE communications_log
        ADD COLUMN subject TEXT;

        COMMENT ON COLUMN communications_log.subject
        IS 'Subject line of the communication';
    END IF;

    -- Add sent_at column if missing (different from created_at)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communications_log' AND column_name = 'sent_at'
    ) THEN
        ALTER TABLE communications_log
        ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

        CREATE INDEX IF NOT EXISTS idx_communications_log_sent_at
        ON communications_log(sent_at DESC);

        COMMENT ON COLUMN communications_log.sent_at
        IS 'When the communication was actually sent';
    END IF;

    -- Add direction column if missing (for inbound/outbound tracking)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communications_log' AND column_name = 'direction'
    ) THEN
        ALTER TABLE communications_log
        ADD COLUMN direction TEXT DEFAULT 'outbound'
        CHECK (direction IN ('inbound', 'outbound'));

        CREATE INDEX IF NOT EXISTS idx_communications_log_direction
        ON communications_log(direction);

        COMMENT ON COLUMN communications_log.direction
        IS 'Direction of communication: inbound or outbound';
    END IF;

END $$;

-- Update any existing null sent_at values to use created_at
UPDATE communications_log
SET sent_at = created_at
WHERE sent_at IS NULL AND created_at IS NOT NULL;

-- Grant appropriate permissions for the new columns
GRANT SELECT, UPDATE ON communications_log TO authenticated;

-- Add helpful indexes for common queries
CREATE INDEX IF NOT EXISTS idx_communications_log_building_sent_at
ON communications_log(building_id, sent_at DESC)
WHERE building_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_communications_log_leaseholder_sent_at
ON communications_log(leaseholder_id, sent_at DESC)
WHERE leaseholder_id IS NOT NULL;

-- Update table comment
COMMENT ON TABLE communications_log IS 'Log of all communications (emails, letters, etc.) with tracking of buildings and leaseholders';