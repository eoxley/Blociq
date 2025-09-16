-- Update communication_templates table if needed
-- This script safely adds missing columns and indexes without breaking existing data

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add category column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'communication_templates'
                 AND column_name = 'category') THEN
    ALTER TABLE communication_templates ADD COLUMN category text default 'general';
  END IF;

  -- Add placeholders column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'communication_templates'
                 AND column_name = 'placeholders') THEN
    ALTER TABLE communication_templates ADD COLUMN placeholders text[] default array[]::text[];
  END IF;

  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'communication_templates'
                 AND column_name = 'is_active') THEN
    ALTER TABLE communication_templates ADD COLUMN is_active boolean default true;
  END IF;

  -- Add created_by column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'communication_templates'
                 AND column_name = 'created_by') THEN
    ALTER TABLE communication_templates ADD COLUMN created_by uuid references auth.users(id) on delete set null;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS communication_templates_type_idx ON communication_templates(type);
CREATE INDEX IF NOT EXISTS communication_templates_category_idx ON communication_templates(category);
CREATE INDEX IF NOT EXISTS communication_templates_active_idx ON communication_templates(is_active);
CREATE INDEX IF NOT EXISTS communication_templates_created_by_idx ON communication_templates(created_by);

-- Enable RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'communication_templates'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS policies if they don't exist
DO $$
BEGIN
  -- Policy for authenticated users to see active templates
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'communication_templates'
    AND policyname = 'Users can view active templates'
  ) THEN
    CREATE POLICY "Users can view active templates" ON communication_templates
      FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);
  END IF;

  -- Policy for authenticated users to create templates
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'communication_templates'
    AND policyname = 'Users can create templates'
  ) THEN
    CREATE POLICY "Users can create templates" ON communication_templates
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;

  -- Policy for users to update their own templates
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'communication_templates'
    AND policyname = 'Users can update own templates'
  ) THEN
    CREATE POLICY "Users can update own templates" ON communication_templates
      FOR UPDATE USING (auth.role() = 'authenticated' AND created_by = auth.uid());
  END IF;

  -- Policy for service role to manage all templates
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'communication_templates'
    AND policyname = 'Service role can manage all templates'
  ) THEN
    CREATE POLICY "Service role can manage all templates" ON communication_templates
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_communication_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'communication_templates_updated_at'
  ) THEN
    CREATE TRIGGER communication_templates_updated_at
      BEFORE UPDATE ON communication_templates
      FOR EACH ROW EXECUTE FUNCTION update_communication_templates_updated_at();
  END IF;
END $$;

-- Verify table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'communication_templates'
ORDER BY ordinal_position;