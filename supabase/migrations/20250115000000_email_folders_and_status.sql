-- Email Folders and Status Migration
-- Adds support for custom email folders and enhanced status tracking

-- Create email_folders table
CREATE TABLE IF NOT EXISTS email_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add status and folder_id columns to incoming_emails (non-breaking)
ALTER TABLE incoming_emails 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unread',
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES email_folders(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_folders_user_id ON email_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_status ON incoming_emails(status);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_folder_id ON incoming_emails(folder_id);

-- Update existing emails to have proper status
UPDATE incoming_emails 
SET status = CASE 
  WHEN unread = true THEN 'unread'
  WHEN handled = true THEN 'handled'
  ELSE 'read'
END
WHERE status IS NULL;

-- Create RLS policies for email_folders
ALTER TABLE email_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own folders" ON email_folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders" ON email_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" ON email_folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" ON email_folders
  FOR DELETE USING (auth.uid() = user_id); 