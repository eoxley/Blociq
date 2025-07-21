-- Fix incoming_emails table schema to match the code requirements
-- Add missing columns that the application expects

DO $$ 
BEGIN
    -- Add from_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'from_name') THEN
        ALTER TABLE incoming_emails ADD COLUMN from_name TEXT;
        RAISE NOTICE 'Added from_name column to incoming_emails table';
    END IF;
    
    -- Add body_full column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'body_full') THEN
        ALTER TABLE incoming_emails ADD COLUMN body_full TEXT;
        RAISE NOTICE 'Added body_full column to incoming_emails table';
    END IF;
    
    -- Add is_read column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'is_read') THEN
        ALTER TABLE incoming_emails ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_read column to incoming_emails table';
    END IF;
    
    -- Add is_handled column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'is_handled') THEN
        ALTER TABLE incoming_emails ADD COLUMN is_handled BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_handled column to incoming_emails table';
    END IF;
    
    -- Add tags column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'tags') THEN
        ALTER TABLE incoming_emails ADD COLUMN tags TEXT[];
        RAISE NOTICE 'Added tags column to incoming_emails table';
    END IF;
    
    -- Add outlook_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'outlook_id') THEN
        ALTER TABLE incoming_emails ADD COLUMN outlook_id TEXT;
        RAISE NOTICE 'Added outlook_id column to incoming_emails table';
    END IF;
    
    -- Add outlook_message_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'outlook_message_id') THEN
        ALTER TABLE incoming_emails ADD COLUMN outlook_message_id TEXT;
        RAISE NOTICE 'Added outlook_message_id column to incoming_emails table';
    END IF;
    
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'user_id') THEN
        ALTER TABLE incoming_emails ADD COLUMN user_id UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added user_id column to incoming_emails table';
    END IF;
    
    -- Add folder column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'folder') THEN
        ALTER TABLE incoming_emails ADD COLUMN folder TEXT DEFAULT 'inbox';
        RAISE NOTICE 'Added folder column to incoming_emails table';
    END IF;
    
    -- Add sync_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'sync_status') THEN
        ALTER TABLE incoming_emails ADD COLUMN sync_status TEXT DEFAULT 'synced';
        RAISE NOTICE 'Added sync_status column to incoming_emails table';
    END IF;
    
    -- Add last_sync_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'last_sync_at') THEN
        ALTER TABLE incoming_emails ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added last_sync_at column to incoming_emails table';
    END IF;
    
    -- Add handled_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'handled_at') THEN
        ALTER TABLE incoming_emails ADD COLUMN handled_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added handled_at column to incoming_emails table';
    END IF;
    
    -- Add handled_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'handled_by') THEN
        ALTER TABLE incoming_emails ADD COLUMN handled_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added handled_by column to incoming_emails table';
    END IF;
    
    -- Add to_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'to_email') THEN
        ALTER TABLE incoming_emails ADD COLUMN to_email TEXT[];
        RAISE NOTICE 'Added to_email column to incoming_emails table';
    END IF;
    
    -- Add cc_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'cc_email') THEN
        ALTER TABLE incoming_emails ADD COLUMN cc_email TEXT[];
        RAISE NOTICE 'Added cc_email column to incoming_emails table';
    END IF;
    
    -- Add body column if it doesn't exist (alias for body_full)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'body') THEN
        ALTER TABLE incoming_emails ADD COLUMN body TEXT;
        RAISE NOTICE 'Added body column to incoming_emails table';
    END IF;
    
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incoming_emails_from_name ON incoming_emails(from_name);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_is_read ON incoming_emails(is_read);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_is_handled ON incoming_emails(is_handled);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_tags ON incoming_emails USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_outlook_id ON incoming_emails(outlook_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_outlook_message_id ON incoming_emails(outlook_message_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_user_id ON incoming_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_folder ON incoming_emails(folder);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_sync_status ON incoming_emails(sync_status);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_last_sync_at ON incoming_emails(last_sync_at);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_handled_at ON incoming_emails(handled_at);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_handled_by ON incoming_emails(handled_by);

-- Update RLS policies to include user_id
DROP POLICY IF EXISTS "Users can view emails for their buildings" ON incoming_emails;
DROP POLICY IF EXISTS "Users can update emails for their buildings" ON incoming_emails;

-- Create new RLS policies that work with user_id
CREATE POLICY "Users can view own emails" ON incoming_emails
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own emails" ON incoming_emails
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own emails" ON incoming_emails
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own emails" ON incoming_emails
  FOR DELETE USING (user_id = auth.uid());

-- Add comments to document the columns
COMMENT ON COLUMN incoming_emails.from_name IS 'Name of the email sender';
COMMENT ON COLUMN incoming_emails.body_full IS 'Full email body content';
COMMENT ON COLUMN incoming_emails.is_read IS 'Whether the email has been read';
COMMENT ON COLUMN incoming_emails.is_handled IS 'Whether the email has been handled/processed';
COMMENT ON COLUMN incoming_emails.tags IS 'AI-generated tags for email categorization';
COMMENT ON COLUMN incoming_emails.outlook_id IS 'Unique identifier from Outlook';
COMMENT ON COLUMN incoming_emails.outlook_message_id IS 'Outlook message ID for Graph API operations';
COMMENT ON COLUMN incoming_emails.user_id IS 'User who owns this email (for RLS)';
COMMENT ON COLUMN incoming_emails.folder IS 'Email folder (inbox, sent, handled, etc.)';
COMMENT ON COLUMN incoming_emails.sync_status IS 'Status of email sync (synced, failed, pending)';
COMMENT ON COLUMN incoming_emails.last_sync_at IS 'Timestamp of last sync operation';
COMMENT ON COLUMN incoming_emails.handled_at IS 'Timestamp when email was handled';
COMMENT ON COLUMN incoming_emails.handled_by IS 'User who handled the email';

-- Show the current table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'incoming_emails' 
ORDER BY ordinal_position; 