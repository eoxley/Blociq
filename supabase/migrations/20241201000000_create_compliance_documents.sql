-- Create compliance_documents table
CREATE TABLE IF NOT EXISTS compliance_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  compliance_asset_id UUID NOT NULL REFERENCES compliance_assets(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  extracted_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  doc_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_compliance_documents_building_id ON compliance_documents(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_asset_id ON compliance_documents(compliance_asset_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_created_at ON compliance_documents(created_at);

-- Add RLS policies
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view compliance documents for buildings they have access to
CREATE POLICY "Users can view compliance documents for their buildings" ON compliance_documents
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy to allow authenticated users to insert compliance documents
CREATE POLICY "Users can insert compliance documents" ON compliance_documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy to allow authenticated users to update compliance documents
CREATE POLICY "Users can update compliance documents" ON compliance_documents
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Add latest_document_id column to building_compliance_assets table
ALTER TABLE building_compliance_assets 
ADD COLUMN IF NOT EXISTS latest_document_id UUID REFERENCES compliance_documents(id) ON DELETE SET NULL;

-- Add last_renewed_date column to building_compliance_assets table if it doesn't exist
ALTER TABLE building_compliance_assets 
ADD COLUMN IF NOT EXISTS last_renewed_date DATE;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_compliance_documents_updated_at 
  BEFORE UPDATE ON compliance_documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 