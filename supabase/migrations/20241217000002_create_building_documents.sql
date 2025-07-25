-- Recreate building_documents table from scratch with complete schema
CREATE TABLE IF NOT EXISTS building_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  unit_id UUID,
  leaseholder_id UUID,
  file_name TEXT,
  file_url TEXT,
  type TEXT DEFAULT 'Letter',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confidence TEXT,
  suggested_action TEXT,
  auto_linked_building_id UUID,
  full_text TEXT,
  content_summary TEXT,
  confidence_level TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_building_documents_building_id ON building_documents(building_id);
CREATE INDEX IF NOT EXISTS idx_building_documents_unit_id ON building_documents(unit_id);
CREATE INDEX IF NOT EXISTS idx_building_documents_leaseholder_id ON building_documents(leaseholder_id);
CREATE INDEX IF NOT EXISTS idx_building_documents_type ON building_documents(type);
CREATE INDEX IF NOT EXISTS idx_building_documents_created_at ON building_documents(created_at);
CREATE INDEX IF NOT EXISTS idx_building_documents_confidence ON building_documents(confidence);
CREATE INDEX IF NOT EXISTS idx_building_documents_auto_linked_building_id ON building_documents(auto_linked_building_id);
CREATE INDEX IF NOT EXISTS idx_building_documents_confidence_level ON building_documents(confidence_level);
CREATE INDEX IF NOT EXISTS idx_building_documents_updated_at ON building_documents(updated_at);

-- Enable Row Level Security
ALTER TABLE building_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view building documents" ON building_documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update building documents" ON building_documents
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert building documents" ON building_documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete building documents" ON building_documents
  FOR DELETE USING (auth.role() = 'authenticated'); 