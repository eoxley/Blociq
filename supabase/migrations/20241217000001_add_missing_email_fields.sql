-- Add missing fields to incoming_emails table for enhanced email sync
-- This migration adds fields that the new sync-emails endpoint requires

-- Add importance field for email priority
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'importance') THEN
        ALTER TABLE incoming_emails ADD COLUMN importance TEXT DEFAULT 'normal';
        RAISE NOTICE 'Added importance column to incoming_emails table';
    END IF;
END $$;

-- Add has_attachments field
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'has_attachments') THEN
        ALTER TABLE incoming_emails ADD COLUMN has_attachments BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added has_attachments column to incoming_emails table';
    END IF;
END $$;

-- Add is_deleted field for soft deletion
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'is_deleted') THEN
        ALTER TABLE incoming_emails ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_deleted column to incoming_emails table';
    END IF;
END $$;

-- Add deleted_at field for soft deletion timestamp
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'deleted_at') THEN
        ALTER TABLE incoming_emails ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added deleted_at column to incoming_emails table';
    END IF;
END $$;

-- Add deleted_by field for soft deletion user tracking
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'deleted_by') THEN
        ALTER TABLE incoming_emails ADD COLUMN deleted_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added deleted_by column to incoming_emails table';
    END IF;
END $$;

-- Add categories field (separate from tags for Outlook categories)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'categories') THEN
        ALTER TABLE incoming_emails ADD COLUMN categories TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added categories column to incoming_emails table';
    END IF;
END $$;

-- Add flag_status field for Outlook flag status
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'flag_status') THEN
        ALTER TABLE incoming_emails ADD COLUMN flag_status TEXT DEFAULT 'notFlagged';
        RAISE NOTICE 'Added flag_status column to incoming_emails table';
    END IF;
END $$;

-- Add thread_id field for email threading
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'thread_id') THEN
        ALTER TABLE incoming_emails ADD COLUMN thread_id TEXT;
        RAISE NOTICE 'Added thread_id column to incoming_emails table';
    END IF;
END $$;

-- Add message_id field for internet message ID
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'message_id') THEN
        ALTER TABLE incoming_emails ADD COLUMN message_id TEXT;
        RAISE NOTICE 'Added message_id column to incoming_emails table';
    END IF;
END $$;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_incoming_emails_importance ON incoming_emails(importance);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_has_attachments ON incoming_emails(has_attachments);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_is_deleted ON incoming_emails(is_deleted);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_deleted_at ON incoming_emails(deleted_at);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_deleted_by ON incoming_emails(deleted_by);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_categories ON incoming_emails USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_flag_status ON incoming_emails(flag_status);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_thread_id ON incoming_emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_message_id ON incoming_emails(message_id);

-- Add comments for new columns
COMMENT ON COLUMN incoming_emails.importance IS 'Email importance level (low, normal, high)';
COMMENT ON COLUMN incoming_emails.has_attachments IS 'Whether the email has attachments';
COMMENT ON COLUMN incoming_emails.is_deleted IS 'Whether the email has been soft deleted';
COMMENT ON COLUMN incoming_emails.deleted_at IS 'Timestamp when the email was soft deleted';
COMMENT ON COLUMN incoming_emails.deleted_by IS 'User who soft deleted the email';
COMMENT ON COLUMN incoming_emails.categories IS 'Outlook categories/tags for the email';
COMMENT ON COLUMN incoming_emails.flag_status IS 'Outlook flag status (notFlagged, flagged, completed)';
COMMENT ON COLUMN incoming_emails.thread_id IS 'Email conversation/thread ID';
COMMENT ON COLUMN incoming_emails.message_id IS 'Internet message ID for email identification'; 