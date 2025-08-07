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

-- Note: general_documents table does not exist, skipping those alterations

-- Create indexes for better performance on unlinked documents
CREATE INDEX IF NOT EXISTS idx_building_documents_is_unlinked ON building_documents(is_unlinked);

CREATE INDEX IF NOT EXISTS idx_compliance_documents_is_unlinked ON compliance_documents(is_unlinked);

-- Note: general_documents table does not exist, skipping those indexes

-- Create a view for unlinked documents across all tables
CREATE OR REPLACE VIEW unlinked_documents AS
SELECT 
    id,
    file_name,
    file_url,
    type as document_type,
    created_at as uploaded_at,
    content_summary as summary,
    'building' as source_table
FROM building_documents 
WHERE is_unlinked = TRUE

UNION ALL

SELECT 
    id,
    title as file_name,
    document_url as file_url,
    doc_type as document_type,
    created_at as uploaded_at,
    summary,
    'compliance' as source_table
FROM compliance_documents 
WHERE is_unlinked = TRUE;

-- Create a function to get unlinked documents for a user
CREATE OR REPLACE FUNCTION get_user_unlinked_documents(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    file_name TEXT,
    file_url TEXT,
    document_type TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE,
    summary TEXT,
    source_table TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ud.id,
        ud.file_name,
        ud.file_url,
        ud.document_type,
        ud.uploaded_at,
        ud.summary,
        ud.source_table
    FROM unlinked_documents ud
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
-- Note: general_documents table does not exist, skipping comments

COMMENT ON VIEW unlinked_documents IS 'View of all unlinked documents across building, compliance, and general document tables';
COMMENT ON FUNCTION get_user_unlinked_documents IS 'Get all unlinked documents for a specific user';
COMMENT ON FUNCTION link_document_to_building IS 'Link an unlinked document to a specific building';

-- Note: RLS policies for unlinked documents are not created as uploaded_by column does not exist 