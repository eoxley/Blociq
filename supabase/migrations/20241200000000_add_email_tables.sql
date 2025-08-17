-- Create profiles table if it doesn't exist (for signature field)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  full_name VARCHAR(255),
  role VARCHAR(50),
  agency_id UUID,
  building_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add signature field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature TEXT;

-- Create incoming_emails table first (if it doesn't exist)
CREATE TABLE IF NOT EXISTS incoming_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  unit TEXT,
  from_email TEXT NOT NULL,
  subject TEXT,
  body_preview TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sent_emails table
CREATE TABLE IF NOT EXISTS sent_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  to_emails TEXT[] NOT NULL,
  cc_emails TEXT[] DEFAULT '{}',
  from_email TEXT NOT NULL,
  thread_id UUID,
  related_email_id UUID REFERENCES incoming_emails(id) ON DELETE SET NULL,
  created_by_user UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  message_id TEXT, -- For tracking in external email system
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sent_emails_created_by ON sent_emails(created_by_user);
CREATE INDEX IF NOT EXISTS idx_sent_emails_status ON sent_emails(status);
CREATE INDEX IF NOT EXISTS idx_sent_emails_related_email ON sent_emails(related_email_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_thread_id ON sent_emails(thread_id);

-- RLS policies for sent_emails
ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sent emails" ON sent_emails
  FOR SELECT USING (created_by_user = auth.uid());

CREATE POLICY "Users can insert their own sent emails" ON sent_emails
  FOR INSERT WITH CHECK (created_by_user = auth.uid());

CREATE POLICY "Users can update their own sent emails" ON sent_emails
  FOR UPDATE USING (created_by_user = auth.uid());

CREATE POLICY "Users can delete their own sent emails" ON sent_emails
  FOR DELETE USING (created_by_user = auth.uid()); 