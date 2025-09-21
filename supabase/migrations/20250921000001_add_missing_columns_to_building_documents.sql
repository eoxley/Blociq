-- Add missing columns to building_documents table

-- Add title column (required for compliance page)
ALTER TABLE building_documents ADD COLUMN IF NOT EXISTS title TEXT;

-- Add file_size column (required for upload-and-analyse endpoint)
ALTER TABLE building_documents ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Add created_by column (required for upload-and-analyse endpoint)
ALTER TABLE building_documents ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add uploaded_at column (appears to be used in queries)
ALTER TABLE building_documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have a default title based on file_name
UPDATE building_documents
SET title = COALESCE(file_name, 'Untitled Document')
WHERE title IS NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_building_documents_title ON building_documents(title);
CREATE INDEX IF NOT EXISTS idx_building_documents_file_size ON building_documents(file_size);
CREATE INDEX IF NOT EXISTS idx_building_documents_created_by ON building_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_building_documents_uploaded_at ON building_documents(uploaded_at);

-- Update RLS policies to include new columns
DROP POLICY IF EXISTS "Users can view building documents" ON building_documents;
DROP POLICY IF EXISTS "Users can update building documents" ON building_documents;
DROP POLICY IF EXISTS "Users can insert building documents" ON building_documents;
DROP POLICY IF EXISTS "Users can delete building documents" ON building_documents;

-- Recreate RLS policies with proper user-based access
CREATE POLICY "Users can view building documents" ON building_documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update building documents" ON building_documents
  FOR UPDATE USING (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "Users can insert building documents" ON building_documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "Users can delete building documents" ON building_documents
  FOR DELETE USING (auth.role() = 'authenticated' AND created_by = auth.uid());