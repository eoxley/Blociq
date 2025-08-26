-- Migration: Add Lease Extraction Tables
-- This migration creates tables to store lease document extractions and metadata

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- For UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- For trigram text search and GIN indexes

-- Create documents table for storing uploaded files and extraction metadata
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT,
    building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
    document_type TEXT DEFAULT 'unknown',
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    extraction_status TEXT DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
    extracted_text TEXT,
    lease_extraction JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lease_extractions table for detailed lease clause data
CREATE TABLE IF NOT EXISTS public.lease_extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
    building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
    extracted_clauses JSONB NOT NULL,
    summary TEXT,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    metadata JSONB DEFAULT '{}',
    extracted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
-- Standard indexes for common queries
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_building_id ON public.documents(building_id);
CREATE INDEX IF NOT EXISTS idx_documents_extraction_status ON public.documents(extraction_status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON public.documents(document_type);

-- GIN index for JSONB metadata queries (e.g., searching lease documents)
CREATE INDEX IF NOT EXISTS idx_documents_lease_metadata ON public.documents USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_lease_extractions_document_id ON public.lease_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_lease_extractions_building_id ON public.lease_extractions(building_id);
CREATE INDEX IF NOT EXISTS idx_lease_extractions_extracted_by ON public.lease_extractions(extracted_by);
CREATE INDEX IF NOT EXISTS idx_lease_extractions_confidence ON public.lease_extractions(confidence);

-- Create a view for easy access to lease documents with extraction data
CREATE OR REPLACE VIEW public.lease_documents AS
SELECT 
    d.id,
    d.filename,
    d.file_size,
    d.building_id,
    d.uploaded_by,
    d.extraction_status,
    d.created_at,
    le.extracted_clauses,
    le.summary,
    le.confidence,
    le.metadata as extraction_metadata,
    d.metadata as document_metadata
FROM public.documents d
LEFT JOIN public.lease_extractions le ON d.id = le.document_id
WHERE d.lease_extraction IS NOT NULL OR le.id IS NOT NULL;

-- Create a function to get lease extraction statistics
CREATE OR REPLACE FUNCTION public.get_lease_extraction_stats(building_uuid UUID DEFAULT NULL)
RETURNS TABLE(
    total_documents BIGINT,
    lease_documents BIGINT,
    avg_confidence DECIMAL(5,2),
    total_clauses_found BIGINT,
    extraction_coverage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(d.id)::BIGINT as total_documents,
        COUNT(CASE WHEN d.lease_extraction IS NOT NULL THEN 1 END)::BIGINT as lease_documents,
        ROUND(AVG(le.confidence), 2) as avg_confidence,
        SUM(
            CASE 
                WHEN le.extracted_clauses IS NOT NULL 
                THEN jsonb_array_length(le.extracted_clauses) 
                ELSE 0 
            END
        )::BIGINT as total_clauses_found,
        ROUND(
            AVG(
                CASE 
                    WHEN le.metadata->>'keyTermsFound' IS NOT NULL 
                    AND le.metadata->>'totalTerms' IS NOT NULL
                    THEN (le.metadata->>'keyTermsFound')::DECIMAL / (le.metadata->>'totalTerms')::DECIMAL * 100
                    ELSE 0 
                END
            ), 2
        ) as extraction_coverage
    FROM public.documents d
    LEFT JOIN public.lease_extractions le ON d.id = le.document_id
    WHERE (building_uuid IS NULL OR d.building_id = building_uuid)
    AND d.extraction_status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- Create a function to search lease clauses by term
CREATE OR REPLACE FUNCTION public.search_lease_clauses(
    search_term TEXT,
    building_uuid UUID DEFAULT NULL
)
RETURNS TABLE(
    document_id UUID,
    filename TEXT,
    building_id UUID,
    term TEXT,
    clause_text TEXT,
    confidence DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id as document_id,
        d.filename,
        d.building_id,
        (clause->>'term')::TEXT as term,
        (clause->>'text')::TEXT as clause_text,
        le.confidence,
        d.created_at
    FROM public.documents d
    JOIN public.lease_extractions le ON d.id = le.document_id,
    jsonb_array_elements(le.extracted_clauses) as clause
    WHERE (building_uuid IS NULL OR d.building_id = building_uuid)
    AND d.extraction_status = 'completed'
    AND le.confidence > 0.5
    AND (
        clause->>'term' ILIKE '%' || search_term || '%'
        OR clause->>'text' ILIKE '%' || search_term || '%'
    )
    ORDER BY le.confidence DESC, d.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_extractions ENABLE ROW LEVEL SECURITY;

-- Documents table policies
CREATE POLICY "Users can view their own documents" ON public.documents
    FOR SELECT USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can insert their own documents" ON public.documents
    FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own documents" ON public.documents
    FOR UPDATE USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own documents" ON public.documents
    FOR DELETE USING (auth.uid() = uploaded_by);

-- Lease extractions table policies
CREATE POLICY "Users can view lease extractions for their documents" ON public.lease_extractions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.documents d 
            WHERE d.id = document_id AND d.uploaded_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert lease extractions for their documents" ON public.lease_extractions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.documents d 
            WHERE d.id = document_id AND d.uploaded_by = auth.uid()
        )
    );

CREATE POLICY "Users can update lease extractions for their documents" ON public.lease_extractions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.documents d 
            WHERE d.id = document_id AND d.uploaded_by = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lease_extractions TO authenticated;
GRANT SELECT ON public.lease_documents TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lease_extraction_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_lease_clauses(TEXT, UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.documents IS 'Stores uploaded documents and their extraction metadata';
COMMENT ON TABLE public.lease_extractions IS 'Stores detailed lease clause extractions from documents';
COMMENT ON VIEW public.lease_documents IS 'View combining documents with lease extraction data';
COMMENT ON FUNCTION public.get_lease_extraction_stats(UUID) IS 'Returns statistics about lease extractions for a building or globally';
COMMENT ON FUNCTION public.search_lease_clauses(TEXT, UUID) IS 'Searches lease clauses by term across documents';

-- Optional: Insert sample data for testing
-- INSERT INTO public.documents (filename, file_size, file_type, document_type, uploaded_by, extraction_status, extracted_text, lease_extraction, metadata) VALUES
-- ('sample_lease.pdf', 1024000, 'application/pdf', 'lease', '00000000-0000-0000-0000-000000000000', 'completed', 'Sample lease text content...', '{"isLease": true, "confidence": 0.9}', '{"isLease": true, "extractionMethod": "pdf_parser"}');
