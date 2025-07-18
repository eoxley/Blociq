-- Create outgoing_emails table for tracking sent email replies
CREATE TABLE IF NOT EXISTS outgoing_emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id TEXT UNIQUE NOT NULL,
    reply_to_message_id TEXT REFERENCES incoming_emails(message_id),
    to_emails TEXT[] NOT NULL,
    cc_emails TEXT[] DEFAULT '{}',
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    building_id UUID REFERENCES buildings(id),
    sent_by UUID REFERENCES auth.users(id),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attachment_path TEXT,
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_outgoing_emails_reply_to ON outgoing_emails(reply_to_message_id);
CREATE INDEX IF NOT EXISTS idx_outgoing_emails_building_id ON outgoing_emails(building_id);
CREATE INDEX IF NOT EXISTS idx_outgoing_emails_sent_by ON outgoing_emails(sent_by);
CREATE INDEX IF NOT EXISTS idx_outgoing_emails_sent_at ON outgoing_emails(sent_at);

-- Add RLS policies
ALTER TABLE outgoing_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view outgoing emails for buildings they have access to
CREATE POLICY "Users can view outgoing emails for accessible buildings" ON outgoing_emails
    FOR SELECT USING (
        building_id IN (
            SELECT building_id FROM user_buildings WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can insert outgoing emails for buildings they have access to
CREATE POLICY "Users can insert outgoing emails for accessible buildings" ON outgoing_emails
    FOR INSERT WITH CHECK (
        building_id IN (
            SELECT building_id FROM user_buildings WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can update their own outgoing emails
CREATE POLICY "Users can update their own outgoing emails" ON outgoing_emails
    FOR UPDATE USING (sent_by = auth.uid());

-- Add status column to incoming_emails if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'status') THEN
        ALTER TABLE incoming_emails ADD COLUMN status TEXT DEFAULT 'unread';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'handled_at') THEN
        ALTER TABLE incoming_emails ADD COLUMN handled_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'incoming_emails' AND column_name = 'handled_by') THEN
        ALTER TABLE incoming_emails ADD COLUMN handled_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add indexes for incoming_emails status tracking
CREATE INDEX IF NOT EXISTS idx_incoming_emails_status ON incoming_emails(status);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_handled_at ON incoming_emails(handled_at);

-- Update function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for outgoing_emails
CREATE TRIGGER update_outgoing_emails_updated_at 
    BEFORE UPDATE ON outgoing_emails 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 