-- Create Document Intelligence System Tables and Functions
-- This migration safely creates the document intelligence infrastructure
-- Handles existing tables and policies gracefully

BEGIN;

-- 1. Create document_chunks table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES building_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create document_processing_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_processing_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES building_documents(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  processing_type VARCHAR(50) NOT NULL, -- classification, extraction, chunking, embedding
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add indexes to document_chunks (ignore if they exist)
DO $$
BEGIN
  -- Indexes for document_chunks
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_document_chunks_document_id') THEN
    CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_document_chunks_created_at') THEN
    CREATE INDEX idx_document_chunks_created_at ON document_chunks(created_at);
  END IF;
  
  -- Note: Vector index will be created after pgvector extension is confirmed
END $$;

-- 4. Add indexes to document_processing_status (ignore if they exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_doc_processing_document_id') THEN
    CREATE INDEX idx_doc_processing_document_id ON document_processing_status(document_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_doc_processing_status') THEN
    CREATE INDEX idx_doc_processing_status ON document_processing_status(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_doc_processing_type') THEN
    CREATE INDEX idx_doc_processing_type ON document_processing_status(processing_type);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_doc_processing_created_at') THEN
    CREATE INDEX idx_doc_processing_created_at ON document_processing_status(created_at);
  END IF;
END $$;

-- 5. Enable RLS on tables
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_processing_status ENABLE ROW LEVEL SECURITY;

-- 6. More robust policy cleanup - handle all possible policy names
DO $$
DECLARE
    policy_name text;
BEGIN
  -- Drop ALL existing policies on document_chunks
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'document_chunks'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON document_chunks', policy_name);
  END LOOP;
  
  -- Drop ALL existing policies on document_processing_status
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'document_processing_status'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON document_processing_status', policy_name);
  END LOOP;
  
  RAISE NOTICE 'All existing policies dropped successfully';
END $$;

-- 7. Create new policies for document_chunks with unique names
CREATE POLICY "doc_chunks_select_policy" ON document_chunks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "doc_chunks_insert_policy" ON document_chunks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "doc_chunks_update_policy" ON document_chunks
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "doc_chunks_delete_policy" ON document_chunks
  FOR DELETE USING (auth.role() = 'authenticated');

-- 8. Create new policies for document_processing_status with unique names
CREATE POLICY "doc_processing_select_policy" ON document_processing_status
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "doc_processing_insert_policy" ON document_processing_status
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "doc_processing_update_policy" ON document_processing_status
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "doc_processing_delete_policy" ON document_processing_status
  FOR DELETE USING (auth.role() = 'authenticated');

-- 9. Create vector search function (replace if exists)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT,
  file_name TEXT,
  document_type TEXT,
  building_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    bd.file_name,
    bd.type,
    bd.building_id
  FROM document_chunks dc
  JOIN building_documents bd ON dc.document_id = bd.id
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 10. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_documents TO authenticated;

-- 11. Create vector index on document_chunks (only if pgvector is available)
DO $$
BEGIN
  -- Check if pgvector extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    -- Create vector index if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_document_chunks_embedding') THEN
      CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);
      RAISE NOTICE 'Vector index created successfully';
    ELSE
      RAISE NOTICE 'Vector index already exists';
    END IF;
  ELSE
    RAISE NOTICE 'pgvector extension not available - vector index not created';
  END IF;
END $$;

COMMIT;

-- 12. Verify the setup
DO $$
BEGIN
  RAISE NOTICE 'Document Intelligence System Setup Complete!';
  RAISE NOTICE 'Tables created: document_chunks, document_processing_status';
  RAISE NOTICE 'Function created: match_documents';
  RAISE NOTICE 'Policies applied to both tables';
  RAISE NOTICE 'Indexes created for performance';
END $$;
