-- Create email_drafts table for storing AI-generated email drafts
CREATE TABLE IF NOT EXISTS email_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  recipient TEXT,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  draft_content TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own email drafts
CREATE POLICY "Users can view own email drafts" ON email_drafts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own email drafts
CREATE POLICY "Users can insert own email drafts" ON email_drafts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own email drafts
CREATE POLICY "Users can update own email drafts" ON email_drafts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own email drafts
CREATE POLICY "Users can delete own email drafts" ON email_drafts
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_drafts_user_id ON email_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_building_id ON email_drafts(building_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_created_at ON email_drafts(created_at DESC); 