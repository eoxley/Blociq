-- Create email_reply_drafts table for storing AI-generated email reply drafts
CREATE TABLE IF NOT EXISTS email_reply_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID REFERENCES incoming_emails(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  draft_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE email_reply_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own reply drafts
CREATE POLICY "Users can view own reply drafts" ON email_reply_drafts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own reply drafts
CREATE POLICY "Users can insert own reply drafts" ON email_reply_drafts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reply drafts
CREATE POLICY "Users can update own reply drafts" ON email_reply_drafts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own reply drafts
CREATE POLICY "Users can delete own reply drafts" ON email_reply_drafts
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_reply_drafts_email_id ON email_reply_drafts(email_id);
CREATE INDEX IF NOT EXISTS idx_email_reply_drafts_user_id ON email_reply_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_reply_drafts_building_id ON email_reply_drafts(building_id);
CREATE INDEX IF NOT EXISTS idx_email_reply_drafts_created_at ON email_reply_drafts(created_at DESC); 