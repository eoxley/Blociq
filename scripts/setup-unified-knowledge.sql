-- Unified Knowledge System Setup
-- This script enhances your existing tables to work with PDF uploads
-- No new tables needed - everything works with what you already have

-- 1. Ensure the vector extension is enabled for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add any missing columns to founder_knowledge table
ALTER TABLE public.founder_knowledge 
  ADD COLUMN IF NOT EXISTS contexts text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS priority int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS effective_from date DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_on date,
  ADD COLUMN IF NOT EXISTS review_due date,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS last_validated_by text;

-- 3. Add any missing columns to document_chunks table
ALTER TABLE public.document_chunks 
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- 4. Add any missing columns to document_processing_status table
ALTER TABLE public.document_processing_status 
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- 5. Create indexes for better performance (ignore if they exist)
CREATE INDEX IF NOT EXISTS idx_founder_knowledge_contexts ON public.founder_knowledge USING GIN (contexts);
CREATE INDEX IF NOT EXISTS idx_founder_knowledge_category ON public.founder_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_founder_knowledge_active ON public.founder_knowledge(is_active);

-- 6. Insert some default categories into founder_knowledge for testing
INSERT INTO public.founder_knowledge (
  title,
  content,
  category,
  subcategory,
  tags,
  contexts,
  priority,
  version,
  is_active,
  source_url,
  last_validated_by
) VALUES 
(
  'Property Management Best Practices',
  'This is a placeholder document for property management best practices. In production, this would contain the actual content from your uploaded PDF.',
  'Property Management',
  'Best Practices',
  ARRAY['property', 'management', 'best practices', 'guidelines'],
  ARRAY['industry_knowledge', 'pdf_document'],
  1,
  1,
  true,
  'https://example.com/placeholder.pdf',
  'system'
),
(
  'Fire Safety Regulations Guide',
  'This is a placeholder document for fire safety regulations. In production, this would contain the actual content from your uploaded PDF.',
  'Compliance & Regulations',
  'Fire Safety',
  ARRAY['fire', 'safety', 'regulations', 'compliance'],
  ARRAY['industry_knowledge', 'pdf_document'],
  1,
  1,
  true,
  'https://example.com/placeholder.pdf',
  'system'
),
(
  'Section 20 Consultation Process',
  'This is a placeholder document for Section 20 consultation processes. In production, this would contain the actual content from your uploaded PDF.',
  'Major Works',
  'Section 20',
  ARRAY['section20', 'consultation', 'major works', 'leaseholder'],
  ARRAY['industry_knowledge', 'pdf_document'],
  1,
  1,
  true,
  'https://example.com/placeholder.pdf',
  'system'
)
ON CONFLICT (title) DO NOTHING;

-- 7. Create a simple function to get knowledge base stats
CREATE OR REPLACE FUNCTION get_knowledge_base_stats()
RETURNS TABLE (
  total_documents bigint,
  total_chunks bigint,
  categories_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.founder_knowledge WHERE 'industry_knowledge' = ANY(contexts)),
    (SELECT COUNT(*) FROM public.document_chunks),
    (SELECT COUNT(DISTINCT category) FROM public.founder_knowledge WHERE 'industry_knowledge' = ANY(contexts));
END;
$$ LANGUAGE plpgsql;

-- 8. Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_knowledge_base_stats() TO authenticated;

-- 9. Verify the setup
SELECT 
  'Setup Complete' as status,
  (SELECT COUNT(*) FROM public.founder_knowledge WHERE 'industry_knowledge' = ANY(contexts)) as knowledge_documents,
  (SELECT COUNT(*) FROM public.document_chunks) as total_chunks,
  (SELECT COUNT(*) FROM public.document_processing_status) as processing_records;

-- 10. Show available categories
SELECT 
  category,
  subcategory,
  COUNT(*) as document_count
FROM public.founder_knowledge 
WHERE 'industry_knowledge' = ANY(contexts)
GROUP BY category, subcategory
ORDER BY category, subcategory;
