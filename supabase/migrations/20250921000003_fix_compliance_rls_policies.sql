-- Fix RLS policies for compliance tables to use user_buildings relationship
-- The buildings table doesn't have user_id column, need to use user_buildings junction table

-- Drop existing policies that reference non-existent b.user_id
DROP POLICY IF EXISTS "compliance_documents_select_policy" ON compliance_documents;
DROP POLICY IF EXISTS "compliance_documents_insert_policy" ON compliance_documents;
DROP POLICY IF EXISTS "compliance_documents_update_policy" ON compliance_documents;
DROP POLICY IF EXISTS "compliance_documents_delete_policy" ON compliance_documents;

DROP POLICY IF EXISTS "ai_extractions_select_policy" ON ai_document_extractions;
DROP POLICY IF EXISTS "ai_extractions_insert_policy" ON ai_document_extractions;

DROP POLICY IF EXISTS "ai_assignments_select_policy" ON document_ai_assignments;
DROP POLICY IF EXISTS "doc_relationships_select_policy" ON compliance_document_relationships;

-- Create corrected RLS policies for compliance_documents using agency access pattern
CREATE POLICY "compliance_documents_select_policy" ON compliance_documents
    FOR SELECT USING (
        public.user_has_agency_building_access_uuid(building_id)
    );

CREATE POLICY "compliance_documents_insert_policy" ON compliance_documents
    FOR INSERT WITH CHECK (
        public.user_has_agency_building_access_uuid(building_id)
    );

CREATE POLICY "compliance_documents_update_policy" ON compliance_documents
    FOR UPDATE USING (
        public.user_has_agency_building_access_uuid(building_id)
    );

CREATE POLICY "compliance_documents_delete_policy" ON compliance_documents
    FOR DELETE USING (
        public.user_has_agency_building_access_uuid(building_id)
    );

-- Create corrected RLS policies for ai_document_extractions
CREATE POLICY "ai_extractions_select_policy" ON ai_document_extractions
    FOR SELECT USING (
        document_id IN (
            SELECT cd.id FROM compliance_documents cd
            WHERE public.user_has_agency_building_access_uuid(cd.building_id)
        )
    );

CREATE POLICY "ai_extractions_insert_policy" ON ai_document_extractions
    FOR INSERT WITH CHECK (
        document_id IN (
            SELECT cd.id FROM compliance_documents cd
            WHERE public.user_has_agency_building_access_uuid(cd.building_id)
        )
    );

-- Create corrected RLS policies for document_ai_assignments
CREATE POLICY "ai_assignments_select_policy" ON document_ai_assignments
    FOR SELECT USING (
        document_id IN (
            SELECT cd.id FROM compliance_documents cd
            WHERE public.user_has_agency_building_access_uuid(cd.building_id)
        )
    );

-- Create corrected RLS policy for compliance_document_relationships
CREATE POLICY "doc_relationships_select_policy" ON compliance_document_relationships
    FOR SELECT USING (
        primary_document_id IN (
            SELECT cd.id FROM compliance_documents cd
            WHERE public.user_has_agency_building_access_uuid(cd.building_id)
        )
    );

-- Add comments
COMMENT ON POLICY "compliance_documents_select_policy" ON compliance_documents IS 'Allow users to select compliance documents for buildings they have access to via user_buildings';
COMMENT ON POLICY "ai_extractions_select_policy" ON ai_document_extractions IS 'Allow users to select AI extractions for documents in buildings they have access to';