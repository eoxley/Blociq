-- Enhance templates table with AI capabilities
-- Run this script in your Supabase SQL editor

-- Add new columns for AI functionality
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}';

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS parent_template_id UUID REFERENCES templates(id);

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS ai_prompt TEXT;

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS last_ai_updated TIMESTAMP WITH TIME ZONE;

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS is_building_specific BOOLEAN DEFAULT FALSE;

-- Create template_versions table if it doesn't exist
CREATE TABLE IF NOT EXISTS template_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content_text TEXT NOT NULL,
    placeholders TEXT[] NOT NULL,
    ai_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_version ON template_versions(version);
CREATE INDEX IF NOT EXISTS idx_templates_ai_generated ON templates(is_ai_generated);
CREATE INDEX IF NOT EXISTS idx_templates_building_specific ON templates(is_building_specific);
CREATE INDEX IF NOT EXISTS idx_templates_version ON templates(version);

-- Add comments to document the new functionality
COMMENT ON COLUMN templates.ai_metadata IS 'AI-generated metadata and analysis';
COMMENT ON COLUMN templates.version IS 'Template version number';
COMMENT ON COLUMN templates.parent_template_id IS 'Reference to parent template if this is a modified version';
COMMENT ON COLUMN templates.is_ai_generated IS 'Whether this template was created or modified by AI';
COMMENT ON COLUMN templates.ai_prompt IS 'The AI prompt used to create or modify this template';
COMMENT ON COLUMN templates.last_ai_updated IS 'When the template was last updated by AI';
COMMENT ON COLUMN templates.is_building_specific IS 'Whether this template is specific to a particular building';

-- Update existing templates to set building_specific based on content
UPDATE templates 
SET is_building_specific = true 
WHERE content_text LIKE '%{{building_name}}%' 
   OR content_text LIKE '%{{building_address}}%' 
   OR content_text LIKE '%{{unit_number}}%';

-- Create a view for AI-generated templates
CREATE OR REPLACE VIEW ai_templates AS
SELECT 
    id,
    name,
    type,
    description,
    is_ai_generated,
    ai_prompt,
    last_ai_updated,
    version,
    created_at
FROM templates 
WHERE is_ai_generated = true
ORDER BY last_ai_updated DESC NULLS LAST;

-- Create a view for building-specific templates
CREATE OR REPLACE VIEW building_specific_templates AS
SELECT 
    id,
    name,
    type,
    description,
    is_building_specific,
    placeholders,
    created_at
FROM templates 
WHERE is_building_specific = true
ORDER BY created_at DESC;

-- Add RLS policies for template_versions table
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view versions of templates they have access to
CREATE POLICY "Users can view template versions" ON template_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM templates 
            WHERE templates.id = template_versions.template_id
        )
    );

-- Policy: Users can insert versions for templates they can modify
CREATE POLICY "Users can insert template versions" ON template_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM templates 
            WHERE templates.id = template_versions.template_id
        )
    );

-- Function to automatically increment version when template is updated
CREATE OR REPLACE FUNCTION increment_template_version()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.content_text IS DISTINCT FROM NEW.content_text OR 
       OLD.placeholders IS DISTINCT FROM NEW.placeholders THEN
        NEW.version = COALESCE(OLD.version, 0) + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-increment version
CREATE TRIGGER template_version_trigger
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION increment_template_version();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON template_versions TO authenticated;
GRANT SELECT ON ai_templates TO authenticated;
GRANT SELECT ON building_specific_templates TO authenticated;

-- Add comment to document the enhanced system
COMMENT ON TABLE templates IS 'Enhanced templates table with AI capabilities, versioning, and building-specific functionality';
COMMENT ON TABLE template_versions IS 'Template version history for tracking changes and AI modifications';
