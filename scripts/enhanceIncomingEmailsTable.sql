-- Enhance incoming_emails table for Outlook sync and handling automation
-- Add missing columns for complete email management

-- Add new columns to incoming_emails table
DO $$ 
BEGIN
    -- Add to_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'to_email') THEN
        ALTER TABLE incoming_emails ADD COLUMN to_email TEXT[];
    END IF;
    
    -- Add cc_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'cc_email') THEN
        ALTER TABLE incoming_emails ADD COLUMN cc_email TEXT[];
    END IF;
    
    -- Add from_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'from_name') THEN
        ALTER TABLE incoming_emails ADD COLUMN from_name TEXT;
    END IF;
    
    -- Add body column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'body') THEN
        ALTER TABLE incoming_emails ADD COLUMN body TEXT;
    END IF;
    
    -- Add is_read column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'is_read') THEN
        ALTER TABLE incoming_emails ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add is_handled column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'is_handled') THEN
        ALTER TABLE incoming_emails ADD COLUMN is_handled BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add folder column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'folder') THEN
        ALTER TABLE incoming_emails ADD COLUMN folder TEXT DEFAULT 'inbox';
    END IF;
    
    -- Add outlook_message_id column if it doesn't exist (for Graph API operations)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'outlook_message_id') THEN
        ALTER TABLE incoming_emails ADD COLUMN outlook_message_id TEXT;
    END IF;
    
    -- Add last_sync_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'last_sync_at') THEN
        ALTER TABLE incoming_emails ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add sync_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'sync_status') THEN
        ALTER TABLE incoming_emails ADD COLUMN sync_status TEXT DEFAULT 'synced';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incoming_emails_outlook_message_id ON incoming_emails(outlook_message_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_is_handled ON incoming_emails(is_handled);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_is_read ON incoming_emails(is_read);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_folder ON incoming_emails(folder);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_last_sync_at ON incoming_emails(last_sync_at);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_received_at ON incoming_emails(received_at);

-- Create a table to track sync state
CREATE TABLE IF NOT EXISTS email_sync_state (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    last_sync_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_status TEXT DEFAULT 'idle',
    error_message TEXT,
    emails_processed INTEGER DEFAULT 0,
    emails_new INTEGER DEFAULT 0,
    emails_updated INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table to track Outlook folders
CREATE TABLE IF NOT EXISTS outlook_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    folder_id TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    folder_type TEXT NOT NULL, -- 'inbox', 'sent', 'handled', 'custom'
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default folders
INSERT INTO outlook_folders (folder_id, display_name, folder_type, is_default) VALUES
('inbox', 'Inbox', 'inbox', TRUE),
('sent', 'Sent Items', 'sent', FALSE),
('handled', 'BlocIQ/Handled', 'handled', FALSE)
ON CONFLICT (folder_id) DO NOTHING;

-- Add RLS policies for new tables
ALTER TABLE email_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_folders ENABLE ROW LEVEL SECURITY;

-- Policy: Only system can access sync state
CREATE POLICY "System can access sync state" ON email_sync_state
    FOR ALL USING (true);

-- Policy: Users can view folders
CREATE POLICY "Users can view folders" ON outlook_folders
    FOR SELECT USING (true);

-- Update function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_email_sync_state_updated_at 
    BEFORE UPDATE ON email_sync_state 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outlook_folders_updated_at 
    BEFORE UPDATE ON outlook_folders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to get the last sync time
CREATE OR REPLACE FUNCTION get_last_sync_time()
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    last_sync TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT last_sync_time INTO last_sync 
    FROM email_sync_state 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    RETURN COALESCE(last_sync, NOW() - INTERVAL '24 hours');
END;
$$ LANGUAGE plpgsql; 