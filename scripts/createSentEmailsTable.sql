-- Create sent_emails table for logging all sent emails
CREATE TABLE IF NOT EXISTS sent_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    building_id UUID REFERENCES buildings(id),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    outlook_id TEXT, -- Optional: returned message ID from Microsoft Graph
    related_incoming_email UUID REFERENCES incoming_emails(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sent_emails_user_id ON sent_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_sent_at ON sent_emails(sent_at);
CREATE INDEX IF NOT EXISTS idx_sent_emails_building_id ON sent_emails(building_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_outlook_id ON sent_emails(outlook_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_related_incoming ON sent_emails(related_incoming_email);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sent_emails_updated_at 
    BEFORE UPDATE ON sent_emails 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own sent emails
CREATE POLICY "Users can view own sent emails" ON sent_emails
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sent emails" ON sent_emails
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sent emails" ON sent_emails
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sent emails" ON sent_emails
    FOR DELETE USING (auth.uid() = user_id);

-- Add comments to document the table
COMMENT ON TABLE sent_emails IS 'Log of all emails sent through BlocIQ';
COMMENT ON COLUMN sent_emails.user_id IS 'User who sent the email (for RLS)';
COMMENT ON COLUMN sent_emails.to_email IS 'Recipient email address';
COMMENT ON COLUMN sent_emails.subject IS 'Email subject line';
COMMENT ON COLUMN sent_emails.body IS 'Email body content';
COMMENT ON COLUMN sent_emails.building_id IS 'Associated building (optional)';
COMMENT ON COLUMN sent_emails.sent_at IS 'When the email was sent';
COMMENT ON COLUMN sent_emails.outlook_id IS 'Message ID from Microsoft Graph (optional)';
COMMENT ON COLUMN sent_emails.related_incoming_email IS 'Related incoming email if this is a reply (optional)'; 