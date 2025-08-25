-- Add support for PDF documents and industry knowledge extraction
-- This allows users to upload PDF guidance documents and extract industry knowledge

-- Create industry_documents table for PDF storage and processing
CREATE TABLE IF NOT EXISTS public.industry_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT NOT NULL,
  version TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  extracted_content TEXT,
  processed_content JSONB,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'error')),
  processing_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  relevance_score INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Create industry_knowledge_extractions table for AI-processed content
CREATE TABLE IF NOT EXISTS public.industry_knowledge_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.industry_documents(id) ON DELETE CASCADE,
  extraction_type TEXT NOT NULL CHECK (extraction_type IN ('standards', 'guidance', 'procedures', 'requirements')),
  content TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_industry_documents_category ON public.industry_documents(category);
CREATE INDEX IF NOT EXISTS idx_industry_documents_status ON public.industry_documents(status);
CREATE INDEX IF NOT EXISTS idx_industry_documents_source ON public.industry_documents(source);
CREATE INDEX IF NOT EXISTS idx_industry_documents_tags ON public.industry_documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_industry_documents_uploaded_by ON public.industry_documents(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_industry_knowledge_extractions_document_id ON public.industry_knowledge_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_industry_knowledge_extractions_type ON public.industry_knowledge_extractions(extraction_type);

-- Enable Row Level Security
ALTER TABLE public.industry_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_knowledge_extractions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read industry documents" ON public.industry_documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert industry documents" ON public.industry_documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow document owners to update their documents" ON public.industry_documents
  FOR UPDATE USING (auth.uid() = uploaded_by);

CREATE POLICY "Allow authenticated users to read knowledge extractions" ON public.industry_knowledge_extractions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert knowledge extractions" ON public.industry_knowledge_extractions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_industry_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_industry_documents_updated_at 
    BEFORE UPDATE ON public.industry_documents 
    FOR EACH ROW EXECUTE FUNCTION update_industry_documents_updated_at();

-- Create view for easy access to processed industry knowledge
CREATE OR REPLACE VIEW public.industry_knowledge_complete AS
SELECT 
  'document' as type,
  d.id,
  d.category,
  d.title,
  d.source,
  d.version,
  d.extracted_content as content,
  d.tags,
  d.relevance_score,
  d.created_at,
  d.updated_at
FROM public.industry_documents d
WHERE d.status = 'processed' AND d.extracted_content IS NOT NULL

UNION ALL

SELECT 
  'extraction' as type,
  ke.id,
  d.category,
  CONCAT(d.title, ' - ', ke.extraction_type) as title,
  d.source,
  d.version,
  ke.content,
  d.tags,
  d.relevance_score,
  ke.created_at,
  ke.updated_at
FROM public.industry_knowledge_extractions ke
JOIN public.industry_documents d ON ke.document_id = d.id
WHERE d.status = 'processed'

UNION ALL

SELECT 
  'standard' as type,
  s.id,
  s.category,
  s.name as title,
  'Regulation' as source,
  'Current' as version,
  s.description as content,
  ARRAY[s.category] as tags,
  100 as relevance_score,
  s.created_at,
  s.updated_at
FROM public.industry_standards s

UNION ALL

SELECT 
  'guidance' as type,
  g.id,
  g.category,
  g.title,
  g.source,
  g.version,
  g.content,
  g.tags,
  g.relevance_score,
  g.created_at,
  g.updated_at
FROM public.industry_guidance g;

-- Grant access to the view
GRANT SELECT ON public.industry_knowledge_complete TO authenticated;

-- Create function to search across all industry knowledge
CREATE OR REPLACE FUNCTION search_industry_knowledge(search_query TEXT)
RETURNS TABLE (
  type TEXT,
  id UUID,
  category TEXT,
  title TEXT,
  source TEXT,
  version TEXT,
  content TEXT,
  tags TEXT[],
  relevance_score INTEGER,
  created_at TIMESTAMPTZ,
  match_score DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ik.type,
    ik.id,
    ik.category,
    ik.title,
    ik.source,
    ik.version,
    ik.content,
    ik.tags,
    ik.relevance_score,
    ik.created_at,
    (
      CASE 
        WHEN ik.title ILIKE '%' || search_query || '%' THEN 100.0
        WHEN ik.content ILIKE '%' || search_query || '%' THEN 80.0
        WHEN EXISTS (SELECT 1 FROM unnest(ik.tags) tag WHERE tag ILIKE '%' || search_query || '%') THEN 60.0
        ELSE 0.0
      END
    ) + (ik.relevance_score::DECIMAL / 10) as match_score
  FROM public.industry_knowledge_complete ik
  WHERE 
    ik.title ILIKE '%' || search_query || '%' OR
    ik.content ILIKE '%' || search_query || '%' OR
    EXISTS (SELECT 1 FROM unnest(ik.tags) tag WHERE tag ILIKE '%' || search_query || '%')
  ORDER BY match_score DESC, ik.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the search function
GRANT EXECUTE ON FUNCTION search_industry_knowledge(TEXT) TO authenticated;
