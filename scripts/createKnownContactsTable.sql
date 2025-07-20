-- Create known_contacts table for storing contact information
CREATE TABLE IF NOT EXISTS known_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  last_contacted TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- Add RLS policies
ALTER TABLE known_contacts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own contacts
CREATE POLICY "Users can view own contacts" ON known_contacts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own contacts
CREATE POLICY "Users can insert own contacts" ON known_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own contacts
CREATE POLICY "Users can update own contacts" ON known_contacts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own contacts
CREATE POLICY "Users can delete own contacts" ON known_contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_known_contacts_user_email ON known_contacts(user_id, email);
CREATE INDEX IF NOT EXISTS idx_known_contacts_last_contacted ON known_contacts(last_contacted DESC); 