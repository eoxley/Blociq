-- Add support for unlinked documents in BlocIQ
-- This migration adds the ability to upload and process documents without building association

-- Add is_unlinked column to building_documents table
ALTER TABLE building_documents
ADD COLUMN IF NOT EXISTS is_unlinked BOOLEAN DEFAULT FALSE;

-- Add summary column to building_documents table for AI-generated summaries
ALTER TABLE building_documents
ADD COLUMN IF NOT EXISTS summary TEXT;

-- Add is_unlinked column to compliance_documents table
ALTER TABLE compliance_documents
ADD COLUMN IF NOT EXISTS is_unlinked BOOLEAN DEFAULT FALSE;

-- Add summary column to compliance_documents table
ALTER TABLE compliance_documents
ADD COLUMN IF NOT EXISTS summary TEXT;

-- Add is_unlinked column to general_documents table
ALTER TABLE general_documents
ADD COLUMN IF NOT EXISTS is_unlinked BOOLEAN DEFAULT FALSE;

-- Add summary column to general_documents table
ALTER TABLE general_documents
ADD COLUMN IF NOT EXISTS summary TEXT;

-- Create indexes for better performance on unlinked documents
CREATE INDEX IF NOT EXISTS idx_building_documents_is_unlinked ON building_documents(is_unlinked);
CREATE INDEX IF NOT EXISTS idx_building_documents_unlinked_user ON building_documents(uploaded_by) WHERE is_unlinked = TRUE;

CREATE INDEX IF NOT EXISTS idx_compliance_documents_is_unlinked ON compliance_documents(is_unlinked);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_unlinked_user ON compliance_documents(uploaded_by) WHERE is_unlinked = TRUE;

CREATE INDEX IF NOT EXISTS idx_general_documents_is_unlinked ON general_documents(is_unlinked);
CREATE INDEX IF NOT EXISTS idx_general_documents_unlinked_user ON general_documents(uploaded_by) WHERE is_unlinked = TRUE;

-- Create a view for unlinked documents across all tables
CREATE OR REPLACE VIEW unlinked_documents AS
SELECT 
    id,
    file_name,
    file_path,
    file_size,
    file_type,
    file_url,
    document_type,
    uploaded_by,
    uploaded_at,
    classification,
    extracted_text,
    summary,
    status,
    ai_processed_at,
    'building' as source_table
FROM building_documents 
WHERE is_unlinked = TRUE

UNION ALL

SELECT 
    id,
    file_name,
    file_path,
    file_size,
    file_type,
    file_url,
    document_type,
    uploaded_by,
    uploaded_at,
    classification,
    extracted_text,
    summary,
    status,
    ai_processed_at,
    'compliance' as source_table
FROM compliance_documents 
WHERE is_unlinked = TRUE

UNION ALL

SELECT 
    id,
    file_name,
    file_path,
    file_size,
    file_type,
    file_url,
    document_type,
    uploaded_by,
    uploaded_at,
    classification,
    extracted_text,
    summary,
    status,
    ai_processed_at,
    'general' as source_table
FROM general_documents 
WHERE is_unlinked = TRUE;

-- Create a function to get unlinked documents for a user
CREATE OR REPLACE FUNCTION get_user_unlinked_documents(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    file_name TEXT,
    file_path TEXT,
    file_size BIGINT,
    file_type TEXT,
    file_url TEXT,
    document_type TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE,
    classification TEXT,
    summary TEXT,
    status TEXT,
    source_table TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ud.id,
        ud.file_name,
        ud.file_path,
        ud.file_size,
        ud.file_type,
        ud.file_url,
        ud.document_type,
        ud.uploaded_at,
        ud.classification,
        ud.summary,
        ud.status,
        ud.source_table
    FROM unlinked_documents ud
    WHERE ud.uploaded_by = user_uuid
    ORDER BY ud.uploaded_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to link an unlinked document to a building
CREATE OR REPLACE FUNCTION link_document_to_building(
    doc_id UUID,
    building_uuid UUID,
    source_table_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    update_sql TEXT;
    result BOOLEAN := FALSE;
BEGIN
    -- Build dynamic SQL based on source table
    update_sql := format(
        'UPDATE %I SET building_id = $1, is_unlinked = FALSE WHERE id = $2 AND is_unlinked = TRUE',
        source_table_name
    );
    
    -- Execute the update
    EXECUTE update_sql USING building_uuid, doc_id;
    
    -- Check if any rows were affected
    IF FOUND THEN
        result := TRUE;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON COLUMN building_documents.is_unlinked IS 'Flag indicating if document is not linked to a specific building';
COMMENT ON COLUMN building_documents.summary IS 'AI-generated summary of document content';
COMMENT ON COLUMN compliance_documents.is_unlinked IS 'Flag indicating if document is not linked to a specific building';
COMMENT ON COLUMN compliance_documents.summary IS 'AI-generated summary of document content';
COMMENT ON COLUMN general_documents.is_unlinked IS 'Flag indicating if document is not linked to a specific building';
COMMENT ON COLUMN general_documents.summary IS 'AI-generated summary of document content';

COMMENT ON VIEW unlinked_documents IS 'View of all unlinked documents across building, compliance, and general document tables';
COMMENT ON FUNCTION get_user_unlinked_documents IS 'Get all unlinked documents for a specific user';
COMMENT ON FUNCTION link_document_to_building IS 'Link an unlinked document to a specific building';

-- Create RLS policies for unlinked documents
-- Users can view their own unlinked documents
CREATE POLICY "Users can view their own unlinked documents" ON building_documents
    FOR SELECT USING (
        (is_unlinked = TRUE AND uploaded_by = auth.uid()) OR
        (is_unlinked = FALSE)
    );

CREATE POLICY "Users can view their own unlinked documents" ON compliance_documents
    FOR SELECT USING (
        (is_unlinked = TRUE AND uploaded_by = auth.uid()) OR
        (is_unlinked = FALSE)
    );

CREATE POLICY "Users can view their own unlinked documents" ON general_documents
    FOR SELECT USING (
        (is_unlinked = TRUE AND uploaded_by = auth.uid()) OR
        (is_unlinked = FALSE)
    );

-- Users can update their own unlinked documents
CREATE POLICY "Users can update their own unlinked documents" ON building_documents
    FOR UPDATE USING (
        (is_unlinked = TRUE AND uploaded_by = auth.uid()) OR
        (is_unlinked = FALSE AND uploaded_by = auth.uid())
    );

CREATE POLICY "Users can update their own unlinked documents" ON compliance_documents
    FOR UPDATE USING (
        (is_unlinked = TRUE AND uploaded_by = auth.uid()) OR
        (is_unlinked = FALSE AND uploaded_by = auth.uid())
    );

CREATE POLICY "Users can update their own unlinked documents" ON general_documents
    FOR UPDATE USING (
        (is_unlinked = TRUE AND uploaded_by = auth.uid()) OR
        (is_unlinked = FALSE AND uploaded_by = auth.uid())
    ); 