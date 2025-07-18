-- Create tables for document-aware response system

-- Table to store extracted text and analysis from documents
CREATE TABLE IF NOT EXISTS document_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES building_documents(id) ON DELETE CASCADE,
  extracted_text TEXT,
  summary TEXT,
  extracted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table to log document queries for analytics
CREATE TABLE IF NOT EXISTS document_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  document_id UUID REFERENCES building_documents(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_analysis_document_id ON document_analysis(document_id);
CREATE INDEX IF NOT EXISTS idx_document_queries_user_id ON document_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_document_queries_building_id ON document_queries(building_id);
CREATE INDEX IF NOT EXISTS idx_document_queries_document_id ON document_queries(document_id);
CREATE INDEX IF NOT EXISTS idx_document_queries_created_at ON document_queries(created_at);

-- RLS Policies for document_analysis
ALTER TABLE document_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document analysis for their buildings" ON document_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM building_documents bd
      JOIN buildings b ON bd.building_id = b.id
      JOIN profiles p ON p.building_id = b.id
      WHERE bd.id = document_analysis.document_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert document analysis for their buildings" ON document_analysis
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM building_documents bd
      JOIN buildings b ON bd.building_id = b.id
      JOIN profiles p ON p.building_id = b.id
      WHERE bd.id = document_analysis.document_id
      AND p.id = auth.uid()
    )
  );

-- RLS Policies for document_queries
ALTER TABLE document_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own document queries" ON document_queries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own document queries" ON document_queries
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Function to automatically create document_analysis entry when document is uploaded
CREATE OR REPLACE FUNCTION create_document_analysis()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO document_analysis (document_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create document_analysis entry
CREATE TRIGGER trigger_create_document_analysis
  AFTER INSERT ON building_documents
  FOR EACH ROW
  EXECUTE FUNCTION create_document_analysis();

-- Grant permissions
GRANT SELECT, INSERT ON document_analysis TO authenticated;
GRANT SELECT, INSERT ON document_queries TO authenticated; 