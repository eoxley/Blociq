-- Update templates table to include 'letter' type for UK letter formatting
-- Run this script in your Supabase SQL editor

-- First, drop the existing constraint
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_type_check;

-- Add the new constraint with 'letter' included
ALTER TABLE templates ADD CONSTRAINT templates_type_check 
CHECK (type IN ('welcome_letter', 'notice', 'form', 'invoice', 'legal_notice', 'section_20', 'letter'));

-- Insert a sample UK letter template
INSERT INTO templates (name, type, description, storage_path, content_text, placeholders) VALUES
(
    'UK Standard Letter Template',
    'letter',
    'Professional UK-formatted letter template with proper address block, date formatting, and sign-off.',
    'templates/uk_letter_template.docx',
    '{{today_date}}\n\n{{address_block}}\n\nDear {{recipient_name}},\n\n{{letter_body}}\n\n{{sign_off}}',
    ARRAY['today_date', 'address_block', 'recipient_name', 'letter_body', 'sign_off', 'unit_number', 'building_name', 'building_address_line1', 'building_city', 'building_postcode', 'property_manager_name']
);

-- Create a view for letter templates specifically
CREATE OR REPLACE VIEW letter_templates AS
SELECT 
    id,
    name,
    description,
    content_text,
    placeholders,
    created_at
FROM templates 
WHERE type = 'letter'
ORDER BY created_at DESC;

-- Add comment to document the letter formatting rules
COMMENT ON TABLE templates IS 'Templates table with UK letter formatting support. Letter type templates automatically apply British formatting conventions.'; 