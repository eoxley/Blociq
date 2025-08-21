-- Create Missing Database Tables
-- This migration creates tables that are referenced in the code but don't exist

BEGIN;

-- Create communications_log table
CREATE TABLE IF NOT EXISTS communications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(255) NOT NULL,
  template_id UUID,
  building_name VARCHAR(255),
  created_from_ai BOOLEAN DEFAULT false,
  ai_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create communications table
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  template_type VARCHAR(100),
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create communication_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  template_type VARCHAR(100),
  building_name VARCHAR(255),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE communications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations for authenticated users" ON communications_log 
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON communications 
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON communication_templates 
  FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_communications_log_action_type ON communications_log(action_type);
CREATE INDEX IF NOT EXISTS idx_communications_log_created_at ON communications_log(created_at);
CREATE INDEX IF NOT EXISTS idx_communications_building_id ON communications(building_id);
CREATE INDEX IF NOT EXISTS idx_communications_template_type ON communications(template_type);
CREATE INDEX IF NOT EXISTS idx_communication_templates_type ON communication_templates(template_type);

COMMIT;
