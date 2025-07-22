-- Create communications tables if they don't exist
-- This script ensures the required tables are available for the communications system

-- Communication Templates Table
CREATE TABLE IF NOT EXISTS communication_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'letter', 'notice')),
    category VARCHAR(100) DEFAULT 'general',
    body TEXT NOT NULL,
    subject VARCHAR(500),
    placeholders TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0
);

-- Communications Sent Table
CREATE TABLE IF NOT EXISTS communications_sent (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES communication_templates(id),
    template_name VARCHAR(255),
    sent_by UUID REFERENCES auth.users(id),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    building_id INTEGER REFERENCES buildings(id),
    building_name VARCHAR(255),
    method VARCHAR(50) DEFAULT 'email' CHECK (method IN ('email', 'pdf', 'both')),
    recipients JSONB DEFAULT '[]',
    subject VARCHAR(500),
    body TEXT,
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    recipient_count INTEGER DEFAULT 0,
    email_results JSONB DEFAULT '[]'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_communication_templates_type ON communication_templates(type);
CREATE INDEX IF NOT EXISTS idx_communication_templates_category ON communication_templates(category);
CREATE INDEX IF NOT EXISTS idx_communication_templates_active ON communication_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_communications_sent_sent_by ON communications_sent(sent_by);
CREATE INDEX IF NOT EXISTS idx_communications_sent_building_id ON communications_sent(building_id);
CREATE INDEX IF NOT EXISTS idx_communications_sent_sent_at ON communications_sent(sent_at);
CREATE INDEX IF NOT EXISTS idx_communications_sent_status ON communications_sent(status);

-- Add RLS policies
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications_sent ENABLE ROW LEVEL SECURITY;

-- RLS policies for communication_templates
CREATE POLICY "Users can view their own templates" ON communication_templates
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own templates" ON communication_templates
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates" ON communication_templates
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates" ON communication_templates
    FOR DELETE USING (auth.uid() = created_by);

-- RLS policies for communications_sent
CREATE POLICY "Users can view their own communications" ON communications_sent
    FOR SELECT USING (auth.uid() = sent_by);

CREATE POLICY "Users can create their own communications" ON communications_sent
    FOR INSERT WITH CHECK (auth.uid() = sent_by);

-- Insert some sample templates
INSERT INTO communication_templates (name, description, type, category, body, subject, created_by) VALUES
(
    'Welcome Letter',
    'Standard welcome letter for new leaseholders',
    'letter',
    'welcome',
    'Dear [leaseholder_name],

Welcome to [building_name]! We are delighted to have you as part of our community.

Your property is located at [building_address] and we hope you will be very happy here.

If you have any questions or need assistance, please don''t hesitate to contact us.

Kind regards,
[manager_name]
Property Manager',
    'Welcome to [building_name]',
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'Maintenance Notice',
    'Notice for scheduled maintenance work',
    'notice',
    'maintenance',
    'Dear [leaseholder_name],

This is to inform you that maintenance work will be carried out at [building_name] on [date].

Work details: [work_description]
Duration: [maintenance_duration]
Affected areas: [affected_areas]

We apologise for any inconvenience and thank you for your understanding.

Kind regards,
[manager_name]
Property Manager',
    'Maintenance Notice - [building_name]',
    (SELECT id FROM auth.users LIMIT 1)
),
(
    'Rent Reminder',
    'Friendly reminder about rent payment',
    'email',
    'general',
    'Dear [leaseholder_name],

This is a friendly reminder that your rent payment of [rent_amount] is due on [due_date].

Please ensure payment is made on time to avoid any late fees.

Payment method: [payment_method]
Reference: [payment_reference]

If you have any questions, please contact us.

Kind regards,
[manager_name]
Property Manager',
    'Rent Reminder - [building_name]',
    (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON communication_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON communications_sent TO authenticated; 