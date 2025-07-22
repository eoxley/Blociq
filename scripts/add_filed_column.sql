-- Add filed column to incoming_emails table
ALTER TABLE incoming_emails ADD COLUMN IF NOT EXISTS filed BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_incoming_emails_filed ON incoming_emails(filed);

-- Create outlook_folders table for storing folder IDs
CREATE TABLE IF NOT EXISTS outlook_folders (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_name VARCHAR(255) NOT NULL,
  folder_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, folder_name)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_outlook_folders_user_id ON outlook_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_outlook_folders_folder_name ON outlook_folders(folder_name); 