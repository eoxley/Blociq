-- Create comprehensive communications system for BlocIQ
-- This migration sets up the complete communications infrastructure

-- Create communication_templates table
CREATE TABLE IF NOT EXISTS communication_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('email', 'letter', 'notice')),
    category TEXT DEFAULT 'general',
    body TEXT NOT NULL,
    placeholders JSONB DEFAULT '[]',
    subject TEXT, -- For emails
    is_active BOOLEAN DEFAULT TRUE,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0
);

-- Create communications_log table
CREATE TABLE IF NOT EXISTS communications_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES communication_templates(id) ON DELETE SET NULL,
    template_name TEXT NOT NULL,
    sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    building_name TEXT,
    method TEXT NOT NULL CHECK (method IN ('email', 'pdf', 'both')),
    recipients JSONB NOT NULL DEFAULT '[]',
    subject TEXT,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Create communication_recipients table for tracking individual recipients
CREATE TABLE IF NOT EXISTS communication_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    communication_id UUID REFERENCES communications_log(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('leaseholder', 'resident', 'unit', 'building')),
    recipient_id UUID, -- Can reference units, buildings, or be null for external emails
    recipient_name TEXT NOT NULL,
    recipient_email TEXT,
    recipient_address TEXT,
    unit_number TEXT,
    building_name TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced', 'opened')),
    opened_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_communication_templates_type ON communication_templates(type);
CREATE INDEX IF NOT EXISTS idx_communication_templates_category ON communication_templates(category);
CREATE INDEX IF NOT EXISTS idx_communication_templates_uploaded_by ON communication_templates(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_communication_templates_last_used_at ON communication_templates(last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_templates_is_active ON communication_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_communications_log_template_id ON communications_log(template_id);
CREATE INDEX IF NOT EXISTS idx_communications_log_sent_by ON communications_log(sent_by);
CREATE INDEX IF NOT EXISTS idx_communications_log_sent_at ON communications_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_log_building_id ON communications_log(building_id);
CREATE INDEX IF NOT EXISTS idx_communications_log_method ON communications_log(method);
CREATE INDEX IF NOT EXISTS idx_communications_log_status ON communications_log(status);

CREATE INDEX IF NOT EXISTS idx_communication_recipients_communication_id ON communication_recipients(communication_id);
CREATE INDEX IF NOT EXISTS idx_communication_recipients_recipient_type ON communication_recipients(recipient_type);
CREATE INDEX IF NOT EXISTS idx_communication_recipients_recipient_email ON communication_recipients(recipient_email);
CREATE INDEX IF NOT EXISTS idx_communication_recipients_sent_at ON communication_recipients(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_recipients_status ON communication_recipients(status);

-- Enable Row Level Security (RLS)
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_recipients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for communication_templates
CREATE POLICY "Communication templates are viewable by authenticated users" ON communication_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Communication templates can be created by authenticated users" ON communication_templates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Communication templates can be updated by authenticated users" ON communication_templates
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Communication templates can be deleted by authenticated users" ON communication_templates
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for communications_log
CREATE POLICY "Communications log are viewable by authenticated users" ON communications_log
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Communications log can be created by authenticated users" ON communications_log
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Communications log can be updated by authenticated users" ON communications_log
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create RLS policies for communication_recipients
CREATE POLICY "Communication recipients are viewable by authenticated users" ON communication_recipients
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Communication recipients can be created by authenticated users" ON communication_recipients
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Communication recipients can be updated by authenticated users" ON communication_recipients
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_communication_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_communication_templates_updated_at
    BEFORE UPDATE ON communication_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_communication_templates_updated_at();

-- Create trigger to update template usage statistics
CREATE OR REPLACE FUNCTION update_template_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the template's last_used_at and usage_count
    UPDATE communication_templates 
    SET 
        last_used_at = NOW(),
        usage_count = usage_count + 1
    WHERE id = NEW.template_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_usage_stats_trigger
    AFTER INSERT ON communications_log
    FOR EACH ROW
    EXECUTE FUNCTION update_template_usage_stats();

-- Create view for communication statistics
CREATE OR REPLACE VIEW communication_stats AS
SELECT 
    COUNT(*) as total_communications,
    COUNT(CASE WHEN method = 'email' THEN 1 END) as email_count,
    COUNT(CASE WHEN method = 'pdf' THEN 1 END) as pdf_count,
    COUNT(CASE WHEN method = 'both' THEN 1 END) as both_count,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful_sends,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_sends,
    COUNT(DISTINCT building_id) as buildings_contacted,
    COUNT(DISTINCT template_id) as templates_used,
    MAX(sent_at) as last_communication_date
FROM communications_log;

-- Create view for template usage statistics
CREATE OR REPLACE VIEW template_usage_stats AS
SELECT 
    ct.id,
    ct.name,
    ct.type,
    ct.category,
    ct.usage_count,
    ct.last_used_at,
    ct.created_at,
    COUNT(cl.id) as total_sends,
    COUNT(CASE WHEN cl.status = 'sent' THEN 1 END) as successful_sends,
    COUNT(CASE WHEN cl.status = 'failed' THEN 1 END) as failed_sends
FROM communication_templates ct
LEFT JOIN communications_log cl ON ct.id = cl.template_id
GROUP BY ct.id, ct.name, ct.type, ct.category, ct.usage_count, ct.last_used_at, ct.created_at
ORDER BY ct.usage_count DESC, ct.last_used_at DESC;

-- Add comments for documentation
COMMENT ON TABLE communication_templates IS 'Stores communication templates for letters, emails, and notices';
COMMENT ON TABLE communications_log IS 'Logs all sent communications with metadata';
COMMENT ON TABLE communication_recipients IS 'Tracks individual recipients for each communication';
COMMENT ON COLUMN communication_templates.placeholders IS 'JSON array of available merge fields (e.g., ["{{name}}", "{{unit}}", "{{building}}"])';
COMMENT ON COLUMN communications_log.recipients IS 'JSON array of recipient information';
COMMENT ON COLUMN communications_log.metadata IS 'Additional data like merge field values, attachments, etc.';
COMMENT ON COLUMN communication_recipients.metadata IS 'Additional recipient-specific data'; 