-- Create incoming_emails table with complete schema
CREATE TABLE IF NOT EXISTS incoming_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  user_id UUID, -- only if needed for AI/tracking, omit FK if users not yet defined
  from_name TEXT,
  from_email TEXT,
  subject TEXT,
  body TEXT,
  body_preview TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN DEFAULT false,
  is_handled BOOLEAN DEFAULT false,
  handled_by UUID,
  handled_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  outlook_id TEXT,
  outlook_message_id TEXT,
  folder TEXT,
  sync_status TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  suggested_action_type TEXT,
  suggested_template_id UUID,
  related_unit_id UUID,
  ai_analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incoming_emails_building_id ON incoming_emails(building_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_user_id ON incoming_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_from_name ON incoming_emails(from_name);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_from_email ON incoming_emails(from_email);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_subject ON incoming_emails(subject);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_received_at ON incoming_emails(received_at);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_is_read ON incoming_emails(is_read);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_is_handled ON incoming_emails(is_handled);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_handled_by ON incoming_emails(handled_by);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_handled_at ON incoming_emails(handled_at);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_tags ON incoming_emails USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_outlook_id ON incoming_emails(outlook_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_outlook_message_id ON incoming_emails(outlook_message_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_folder ON incoming_emails(folder);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_sync_status ON incoming_emails(sync_status);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_last_sync_at ON incoming_emails(last_sync_at);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_suggested_action_type ON incoming_emails(suggested_action_type);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_suggested_template_id ON incoming_emails(suggested_template_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_related_unit_id ON incoming_emails(related_unit_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_ai_analyzed_at ON incoming_emails(ai_analyzed_at);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_created_at ON incoming_emails(created_at);

-- Enable Row Level Security
ALTER TABLE incoming_emails ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own emails" ON incoming_emails
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own emails" ON incoming_emails
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own emails" ON incoming_emails
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own emails" ON incoming_emails
  FOR DELETE USING (user_id = auth.uid()); 