-- Communications System Database Setup
-- Run this script in your Supabase SQL editor

-- Create templates table with AI features
CREATE TABLE IF NOT EXISTS templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('welcome_letter', 'notice', 'form', 'invoice', 'legal_notice', 'section_20')),
    description TEXT,
    storage_path VARCHAR(500) NOT NULL,
    content_text TEXT, -- ✅ NEW: Extracted text content for AI processing
    placeholders TEXT[], -- ✅ NEW: Array of available placeholders
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create template_embeddings table for semantic search
CREATE TABLE IF NOT EXISTS template_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    embedding VECTOR(1536), -- OpenAI embedding vector
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generated_documents table
CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    filled_by VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    placeholder_data JSONB, -- ✅ NEW: Store the data used to fill placeholders
    ai_generated BOOLEAN DEFAULT FALSE, -- ✅ NEW: Track if AI was used
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_content_text ON templates USING GIN (to_tsvector('english', content_text));
CREATE INDEX IF NOT EXISTS idx_generated_documents_template_id ON generated_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_building_id ON generated_documents(building_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_created_at ON generated_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_documents_ai_generated ON generated_documents(ai_generated);

-- Create vector index for embeddings (requires pgvector extension)
-- CREATE INDEX IF NOT EXISTS idx_template_embeddings_vector ON template_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Enable Row Level Security (RLS)
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_embeddings ENABLE ROW LEVEL SECURITY;

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

-- Create RLS policies for template_embeddings
CREATE POLICY "Template embeddings are viewable by authenticated users" ON template_embeddings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Template embeddings can be created by authenticated users" ON template_embeddings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Insert sample templates with content_text and placeholders
INSERT INTO templates (name, type, description, storage_path, content_text, placeholders) VALUES
(
    'Welcome Letter Template',
    'welcome_letter',
    'A professional welcome letter for new leaseholders with building information and contact details.',
    'templates/welcome_letter_template.docx',
    'Dear {{leaseholder_name}}, Welcome to {{building_name}}! We are delighted to welcome you as a new leaseholder. Your unit {{unit_number}} is now ready for occupancy. Please contact {{property_manager_name}} at {{contact_email}} or {{contact_phone}} for any questions. Best regards, The Management Team',
    ARRAY['leaseholder_name', 'building_name', 'unit_number', 'property_manager_name', 'contact_email', 'contact_phone']
),
(
    'Service Charge Notice',
    'notice',
    'Formal notice for service charge increases or changes with detailed breakdown.',
    'templates/service_charge_notice.docx',
    'NOTICE OF SERVICE CHARGE CHANGE Dear {{leaseholder_name}}, This notice is to inform you that the service charge for {{building_name}}, Unit {{unit_number}} will change to {{service_charge_amount}} effective {{effective_date}}. This change is necessary due to {{reason_for_change}}. If you have any questions, please contact {{property_manager_name}} at {{contact_email}}. Sincerely, The Management Team',
    ARRAY['leaseholder_name', 'building_name', 'unit_number', 'service_charge_amount', 'effective_date', 'reason_for_change', 'property_manager_name', 'contact_email']
),
(
    'Section 20 Notice',
    'section_20',
    'Legal notice for major works requiring leaseholder consultation.',
    'templates/section_20_notice.docx',
    'SECTION 20 NOTICE OF MAJOR WORKS Dear {{leaseholder_name}}, We are writing to inform you of proposed major works at {{building_name}} affecting Unit {{unit_number}}. The works include {{works_description}} and are estimated to cost {{estimated_cost}}. The contractor proposed is {{contractor_name}}. You have {{consultation_period}} days to respond. For more information, contact {{property_manager_name}} at {{contact_email}}. Yours sincerely, The Management Team',
    ARRAY['leaseholder_name', 'building_name', 'unit_number', 'works_description', 'estimated_cost', 'contractor_name', 'consultation_period', 'property_manager_name', 'contact_email']
),
(
    'Maintenance Request Form',
    'form',
    'Standardized form for leaseholders to request maintenance or repairs.',
    'templates/maintenance_request_form.docx',
    'MAINTENANCE REQUEST FORM Building: {{building_name}} Unit: {{unit_number}} Leaseholder: {{leaseholder_name}} Issue Description: {{issue_description}} Urgency: {{urgency_level}} Contact: {{contact_phone}} Date: {{today_date}}',
    ARRAY['building_name', 'unit_number', 'leaseholder_name', 'issue_description', 'urgency_level', 'contact_phone', 'today_date']
),
(
    'Rent Increase Notice',
    'notice',
    'Official notice for rent increases with required legal information.',
    'templates/rent_increase_notice.docx',
    'NOTICE OF RENT INCREASE Dear {{leaseholder_name}}, This notice is to inform you that the rent for {{building_name}}, Unit {{unit_number}} will increase from {{current_rent}} to {{new_rent}} effective {{effective_date}}. This increase is {{percentage_increase}}% and is in accordance with your lease terms. If you have any questions, please contact {{property_manager_name}} at {{contact_email}}. Sincerely, The Management Team',
    ARRAY['leaseholder_name', 'building_name', 'unit_number', 'current_rent', 'new_rent', 'effective_date', 'percentage_increase', 'property_manager_name', 'contact_email']
),
(
    'Service Charge Invoice',
    'invoice',
    'Professional invoice template for service charge payments.',
    'templates/service_charge_invoice.docx',
    'SERVICE CHARGE INVOICE Building: {{building_name}} Unit: {{unit_number}} Leaseholder: {{leaseholder_name}} Amount Due: {{service_charge_amount}} Due Date: {{due_date}} Invoice Number: {{invoice_number}} Date: {{today_date}} Please make payment to: {{payment_details}}',
    ARRAY['building_name', 'unit_number', 'leaseholder_name', 'service_charge_amount', 'due_date', 'invoice_number', 'today_date', 'payment_details']
),
(
    'Building Access Notice',
    'notice',
    'Notice for building access changes, maintenance work, or security updates.',
    'templates/building_access_notice.docx',
    'BUILDING ACCESS NOTICE Dear {{leaseholder_name}}, This notice is to inform you of {{access_change_type}} at {{building_name}} affecting Unit {{unit_number}}. Details: {{access_details}} Duration: {{duration}} Contact: {{property_manager_name}} at {{contact_email}} or {{contact_phone}}. Thank you for your cooperation. The Management Team',
    ARRAY['leaseholder_name', 'access_change_type', 'building_name', 'unit_number', 'access_details', 'duration', 'property_manager_name', 'contact_email', 'contact_phone']
),
(
    'Leaseholder Survey',
    'form',
    'Survey form for gathering feedback from leaseholders.',
    'templates/leaseholder_survey.docx',
    'LEASEHOLDER SATISFACTION SURVEY Building: {{building_name}} Unit: {{unit_number}} Leaseholder: {{leaseholder_name}} Date: {{today_date}} Please rate the following services: 1. Building Maintenance: {{maintenance_rating}} 2. Communication: {{communication_rating}} 3. Response Time: {{response_rating}} Comments: {{additional_comments}}',
    ARRAY['building_name', 'unit_number', 'leaseholder_name', 'today_date', 'maintenance_rating', 'communication_rating', 'response_rating', 'additional_comments']
),
(
    'Emergency Contact Form',
    'form',
    'Form for collecting emergency contact information from leaseholders.',
    'templates/emergency_contact_form.docx',
    'EMERGENCY CONTACT FORM Building: {{building_name}} Unit: {{unit_number}} Leaseholder: {{leaseholder_name}} Primary Contact: {{primary_contact_name}} - {{primary_contact_phone}} Secondary Contact: {{secondary_contact_name}} - {{secondary_contact_phone}} Emergency Access: {{emergency_access_notes}} Date: {{today_date}}',
    ARRAY['building_name', 'unit_number', 'leaseholder_name', 'primary_contact_name', 'primary_contact_phone', 'secondary_contact_name', 'secondary_contact_phone', 'emergency_access_notes', 'today_date']
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

-- Create function to generate embeddings (requires OpenAI API)
CREATE OR REPLACE FUNCTION generate_template_embedding(template_id UUID)
RETURNS VOID AS $$
BEGIN
    -- This function would call OpenAI API to generate embeddings
    -- Implementation depends on your OpenAI integration
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Create view for template statistics
CREATE OR REPLACE VIEW template_stats AS
SELECT 
    t.type,
    COUNT(t.id) as template_count,
    COUNT(gd.id) as generated_count,
    COUNT(CASE WHEN gd.ai_generated THEN 1 END) as ai_generated_count,
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
    gd.filled_by,
    gd.ai_generated
FROM generated_documents gd
JOIN templates t ON gd.template_id = t.id
LEFT JOIN buildings b ON gd.building_id = b.id
ORDER BY gd.created_at DESC
LIMIT 50;

-- Create view for AI-ready templates
CREATE OR REPLACE VIEW ai_ready_templates AS
SELECT 
    t.id,
    t.name,
    t.type,
    t.description,
    t.content_text,
    t.placeholders,
    te.embedding
FROM templates t
LEFT JOIN template_embeddings te ON t.id = te.template_id
WHERE t.content_text IS NOT NULL; 