-- Communications System Database Setup
-- Run this script in your Supabase SQL editor

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('welcome_letter', 'notice', 'form', 'invoice')),
    description TEXT,
    storage_path VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generated_documents table
CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    filled_by VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_documents_template_id ON generated_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_building_id ON generated_documents(building_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_created_at ON generated_documents(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for templates
CREATE POLICY "Templates are viewable by authenticated users" ON templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Templates can be created by authenticated users" ON templates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Templates can be updated by authenticated users" ON templates
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Templates can be deleted by authenticated users" ON templates
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for generated_documents
CREATE POLICY "Generated documents are viewable by authenticated users" ON generated_documents
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Generated documents can be created by authenticated users" ON generated_documents
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Insert sample templates
INSERT INTO templates (name, type, description, storage_path) VALUES
(
    'Welcome Letter Template',
    'welcome_letter',
    'A professional welcome letter for new leaseholders with building information and contact details.',
    'templates/welcome_letter_template.docx'
),
(
    'Service Charge Notice',
    'notice',
    'Formal notice for service charge increases or changes with detailed breakdown.',
    'templates/service_charge_notice.docx'
),
(
    'Maintenance Request Form',
    'form',
    'Standardized form for leaseholders to request maintenance or repairs.',
    'templates/maintenance_request_form.docx'
),
(
    'Rent Increase Notice',
    'notice',
    'Official notice for rent increases with required legal information.',
    'templates/rent_increase_notice.docx'
),
(
    'Service Charge Invoice',
    'invoice',
    'Professional invoice template for service charge payments.',
    'templates/service_charge_invoice.docx'
),
(
    'Building Access Notice',
    'notice',
    'Notice for building access changes, maintenance work, or security updates.',
    'templates/building_access_notice.docx'
),
(
    'Leaseholder Survey',
    'form',
    'Survey form for gathering feedback from leaseholders.',
    'templates/leaseholder_survey.docx'
),
(
    'Emergency Contact Form',
    'form',
    'Form for collecting emergency contact information from leaseholders.',
    'templates/emergency_contact_form.docx'
);

-- Create storage buckets if they don't exist
-- Note: This needs to be done through the Supabase dashboard or API
-- Buckets needed:
-- - 'templates' (for storing original .docx templates)
-- - 'generated' (for storing generated documents)

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for templates table
CREATE TRIGGER update_templates_updated_at 
    BEFORE UPDATE ON templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for template statistics
CREATE OR REPLACE VIEW template_stats AS
SELECT 
    t.type,
    COUNT(t.id) as template_count,
    COUNT(gd.id) as generated_count,
    MAX(gd.created_at) as last_generated
FROM templates t
LEFT JOIN generated_documents gd ON t.id = gd.template_id
GROUP BY t.type;

-- Create view for recent activity
CREATE OR REPLACE VIEW recent_communications AS
SELECT 
    gd.id,
    gd.created_at,
    t.name as template_name,
    t.type as template_type,
    b.name as building_name,
    gd.filled_by
FROM generated_documents gd
JOIN templates t ON gd.template_id = t.id
LEFT JOIN buildings b ON gd.building_id = b.id
ORDER BY gd.created_at DESC
LIMIT 50; 