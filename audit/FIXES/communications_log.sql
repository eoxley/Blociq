-- Fix communications_log table missing 'type' column
-- This patch adds the missing 'type' column that is referenced by 25+ queries in the codebase

BEGIN;

-- Add type column to communications_log table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'communications_log'
        AND column_name = 'type'
    ) THEN
        -- Add the type column with common communication types
        ALTER TABLE communications_log
        ADD COLUMN type TEXT CHECK (type IN ('email', 'letter', 'call', 'meeting', 'sms', 'document', 'other'));

        -- Create index for performance on type filtering
        CREATE INDEX IF NOT EXISTS idx_communications_log_type ON communications_log(type);

        -- Add comment explaining the column
        COMMENT ON COLUMN communications_log.type IS 'Type of communication: email, letter, call, meeting, sms, document, other';

        -- Set default values based on existing data patterns
        -- Update existing records to infer type from metadata or direction
        UPDATE communications_log
        SET type = CASE
            WHEN metadata->>'content_type' LIKE '%email%' OR subject IS NOT NULL THEN 'email'
            WHEN metadata->>'content_type' LIKE '%letter%' OR metadata->>'document_type' = 'letter' THEN 'letter'
            WHEN metadata->>'call_duration' IS NOT NULL OR metadata->>'phone_number' IS NOT NULL THEN 'call'
            WHEN direction = 'inbound' AND body IS NOT NULL THEN 'email'
            WHEN direction = 'outbound' AND body IS NOT NULL THEN 'email'
            ELSE 'other'
        END
        WHERE type IS NULL;

        -- Set default value for future inserts
        ALTER TABLE communications_log
        ALTER COLUMN type SET DEFAULT 'other';

        RAISE NOTICE 'Added type column to communications_log table with default values';
    ELSE
        RAISE NOTICE 'Type column already exists in communications_log table';
    END IF;
END $$;

-- Verify the fix by checking column exists
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'communications_log'
        AND column_name = 'type'
    ) INTO column_exists;

    IF column_exists THEN
        RAISE NOTICE 'SUCCESS: Type column verified in communications_log table';
    ELSE
        RAISE EXCEPTION 'FAILURE: Type column still missing from communications_log table';
    END IF;
END $$;

-- Add any missing columns that might be referenced by the codebase
-- These were found during the audit as commonly expected columns

-- Add status column if not exists (for tracking communication status)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'communications_log'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE communications_log
        ADD COLUMN status TEXT CHECK (status IN ('sent', 'delivered', 'failed', 'pending', 'read')) DEFAULT 'sent';

        CREATE INDEX IF NOT EXISTS idx_communications_log_status ON communications_log(status);
        COMMENT ON COLUMN communications_log.status IS 'Status of communication delivery';

        RAISE NOTICE 'Added status column to communications_log table';
    END IF;
END $$;

-- Add recipient_email column if not exists (commonly referenced)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'communications_log'
        AND column_name = 'recipient_email'
    ) THEN
        ALTER TABLE communications_log
        ADD COLUMN recipient_email TEXT;

        CREATE INDEX IF NOT EXISTS idx_communications_log_recipient_email ON communications_log(recipient_email);
        COMMENT ON COLUMN communications_log.recipient_email IS 'Primary recipient email address';

        RAISE NOTICE 'Added recipient_email column to communications_log table';
    END IF;
END $$;

-- Update table comment
COMMENT ON TABLE communications_log IS 'Log of all communications (emails, letters, calls, meetings) with leaseholders and stakeholders';

COMMIT;

-- Display final table structure for verification
\d communications_log;

-- Test the fix with a sample query that was failing
-- This should not error anymore
SELECT type, COUNT(*) as count
FROM communications_log
GROUP BY type
ORDER BY count DESC;

RAISE NOTICE 'Schema fix completed successfully. Communications log table now supports type filtering.';