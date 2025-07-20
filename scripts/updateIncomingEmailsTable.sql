-- Add outlook_id field to incoming_emails table for Outlook integration
ALTER TABLE incoming_emails 
ADD COLUMN IF NOT EXISTS outlook_id TEXT;

-- Create index for faster lookups by outlook_id
CREATE INDEX IF NOT EXISTS idx_incoming_emails_outlook_id 
ON incoming_emails(outlook_id);

-- Add unique constraint to prevent duplicate emails from Outlook
-- (This will fail if there are existing duplicates, so we'll handle that separately)
-- ALTER TABLE incoming_emails 
-- ADD CONSTRAINT unique_outlook_id UNIQUE (outlook_id);

-- Update existing emails to have a default outlook_id if they don't have one
-- This prevents issues with the unique constraint
UPDATE incoming_emails 
SET outlook_id = CONCAT('legacy_', id::text) 
WHERE outlook_id IS NULL;

-- Now we can safely add the unique constraint
ALTER TABLE incoming_emails 
ADD CONSTRAINT unique_outlook_id UNIQUE (outlook_id);

-- Add user_id field if it doesn't exist (for associating emails with users)
ALTER TABLE incoming_emails 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_incoming_emails_user_id 
ON incoming_emails(user_id);

-- Update RLS policies to include user_id filtering
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own emails" ON incoming_emails;
DROP POLICY IF EXISTS "Users can insert own emails" ON incoming_emails;
DROP POLICY IF EXISTS "Users can update own emails" ON incoming_emails;
DROP POLICY IF EXISTS "Users can delete own emails" ON incoming_emails;

-- Create new policies that include user_id filtering
CREATE POLICY "Users can view own emails" ON incoming_emails
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emails" ON incoming_emails
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emails" ON incoming_emails
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emails" ON incoming_emails
    FOR DELETE USING (auth.uid() = user_id);

-- Add comment to document the new field
COMMENT ON COLUMN incoming_emails.outlook_id IS 'Unique identifier from Outlook (internetMessageId) to prevent duplicate imports';
COMMENT ON COLUMN incoming_emails.user_id IS 'User who owns this email (for RLS)'; 