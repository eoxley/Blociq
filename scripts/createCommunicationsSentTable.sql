-- Communications Sent Logging Table
-- Run this script in your Supabase SQL editor

-- Create communications_sent table to log all sent emails
CREATE TABLE IF NOT EXISTS communications_sent (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    message TEXT,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    attachment_path VARCHAR(500),
    sent_by VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    error_message TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_communications_sent_to_email ON communications_sent(to_email);
CREATE INDEX IF NOT EXISTS idx_communications_sent_template_id ON communications_sent(template_id);
CREATE INDEX IF NOT EXISTS idx_communications_sent_building_id ON communications_sent(building_id);
CREATE INDEX IF NOT EXISTS idx_communications_sent_sent_at ON communications_sent(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_sent_sent_by ON communications_sent(sent_by);
CREATE INDEX IF NOT EXISTS idx_communications_sent_status ON communications_sent(status);

-- Enable Row Level Security (RLS)
ALTER TABLE communications_sent ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for communications_sent
CREATE POLICY "Communications sent are viewable by authenticated users" ON communications_sent
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Communications sent can be created by authenticated users" ON communications_sent
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create view for recent communications activity
CREATE OR REPLACE VIEW recent_communications_activity AS
SELECT 
    cs.id,
    cs.sent_at,
    cs.to_email,
    cs.subject,
    cs.status,
    t.name as template_name,
    t.type as template_type,
    b.name as building_name,
    cs.sent_by
FROM communications_sent cs
LEFT JOIN templates t ON cs.template_id = t.id
LEFT JOIN buildings b ON cs.building_id = b.id
ORDER BY cs.sent_at DESC
LIMIT 100;

-- Create view for communications statistics
CREATE OR REPLACE VIEW communications_stats AS
SELECT 
    DATE_TRUNC('day', sent_at) as date,
    COUNT(*) as total_sent,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    COUNT(DISTINCT to_email) as unique_recipients,
    COUNT(DISTINCT template_id) as templates_used
FROM communications_sent
WHERE sent_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', sent_at)
ORDER BY date DESC;

-- Create function to get leaseholder email by unit
CREATE OR REPLACE FUNCTION get_leaseholder_email(building_name TEXT, unit_number TEXT)
RETURNS TEXT AS $$
DECLARE
    email_address TEXT;
BEGIN
    -- This function would look up the leaseholder email from your database
    -- Adjust the table and column names based on your actual schema
    SELECT leaseholder_email INTO email_address
    FROM leases 
    WHERE building_name = $1 AND unit = $2
    LIMIT 1;
    
    RETURN email_address;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE communications_sent IS 'Logs all email communications sent from BlocIQ templates';
COMMENT ON COLUMN communications_sent.to_email IS 'Recipient email address';
COMMENT ON COLUMN communications_sent.attachment_path IS 'Path to the generated document in Supabase Storage';
COMMENT ON COLUMN communications_sent.status IS 'Email sending status: sent, failed, or pending'; 