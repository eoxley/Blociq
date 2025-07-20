-- Create email_summaries table for storing AI-generated email summaries
CREATE TABLE IF NOT EXISTS email_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID REFERENCES incoming_emails(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE email_summaries ENABLE ROW LEVEL SECURITY;

-- Users can only see their own summaries
CREATE POLICY "Users can view own summaries" ON email_summaries
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own summaries
CREATE POLICY "Users can insert own summaries" ON email_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own summaries
CREATE POLICY "Users can update own summaries" ON email_summaries
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own summaries
CREATE POLICY "Users can delete own summaries" ON email_summaries
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_summaries_email_id ON email_summaries(email_id);
CREATE INDEX IF NOT EXISTS idx_email_summaries_user_id ON email_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_email_summaries_created_at ON email_summaries(created_at DESC); 