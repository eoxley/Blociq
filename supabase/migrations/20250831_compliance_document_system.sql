-- Blociq Compliance Asset Document Upload System
-- Migration to enhance existing compliance system with document management and AI processing

-- First, enhance existing building_compliance_assets table with new fields
ALTER TABLE building_compliance_assets 
ADD COLUMN IF NOT EXISTS last_carried_out DATE,
ADD COLUMN IF NOT EXISTS inspector_provider VARCHAR(255),
ADD COLUMN IF NOT EXISTS certificate_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS override_reason TEXT,
ADD COLUMN IF NOT EXISTS document_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS latest_upload_date TIMESTAMP WITH TIME ZONE;

-- Create compliance_documents table for managing uploaded documents
CREATE TABLE IF NOT EXISTS compliance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_compliance_asset_id UUID NOT NULL REFERENCES building_compliance_assets(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    
    -- File information
    file_path TEXT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    
    -- AI Classification
    document_type VARCHAR(100), -- EICR, Gas Safety Certificate, Fire Risk Assessment, etc.
    document_category VARCHAR(100), -- Current Certificate, Historical, Remedial Work, Photos
    ai_confidence_score DECIMAL(5,2), -- 0.00 to 100.00
    
    -- Document status
    is_current_version BOOLEAN DEFAULT true,
    version_number INTEGER DEFAULT 1,
    replaces_document_id UUID REFERENCES compliance_documents(id),
    
    -- Metadata
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by_user_id UUID,
    processed_date TIMESTAMP WITH TIME ZONE,
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    
    -- Indexing for search
    search_vector tsvector,
    
    CONSTRAINT valid_confidence_score CHECK (ai_confidence_score IS NULL OR (ai_confidence_score >= 0 AND ai_confidence_score <= 100))
);

-- Create ai_document_extractions table for storing AI-extracted data
CREATE TABLE IF NOT EXISTS ai_document_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES compliance_documents(id) ON DELETE CASCADE,
    
    -- Extracted structured data (JSONB for flexibility)
    extracted_data JSONB NOT NULL DEFAULT '{}',
    confidence_scores JSONB NOT NULL DEFAULT '{}',
    
    -- Key extracted fields for quick access
    inspection_date DATE,
    next_due_date DATE,
    inspector_name VARCHAR(255),
    inspector_company VARCHAR(255),
    certificate_number VARCHAR(255),
    property_address TEXT,
    compliance_status VARCHAR(50), -- Pass, Fail, Requires Action
    
    -- Processing metadata
    extraction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ai_model_version VARCHAR(50),
    processing_time_ms INTEGER,
    
    -- Verification status
    verified_by_user BOOLEAN DEFAULT false,
    verification_user_id UUID,
    verification_date TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT
);

-- Create document_ai_assignments table for tracking automatic asset assignments
CREATE TABLE IF NOT EXISTS document_ai_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES compliance_documents(id) ON DELETE CASCADE,
    
    -- Assignment details
    suggested_asset_id UUID REFERENCES compliance_assets(id),
    suggested_building_id UUID REFERENCES buildings(id),
    confidence_score DECIMAL(5,2) NOT NULL,
    assignment_reason TEXT,
    
    -- User review
    user_confirmed BOOLEAN,
    confirmed_by_user_id UUID,
    confirmation_date TIMESTAMP WITH TIME ZONE,
    final_asset_id UUID REFERENCES building_compliance_assets(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create compliance_document_relationships table for linking related documents
CREATE TABLE IF NOT EXISTS compliance_document_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_document_id UUID NOT NULL REFERENCES compliance_documents(id) ON DELETE CASCADE,
    related_document_id UUID NOT NULL REFERENCES compliance_documents(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- 'remedial_work', 'follow_up', 'updated_version', 'supporting_photo'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(primary_document_id, related_document_id, relationship_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_documents_building_asset ON compliance_documents(building_compliance_asset_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_building ON compliance_documents(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_type ON compliance_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_upload_date ON compliance_documents(upload_date);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_current ON compliance_documents(is_current_version) WHERE is_current_version = true;
CREATE INDEX IF NOT EXISTS idx_compliance_documents_search ON compliance_documents USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_ai_extractions_document ON ai_document_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_extractions_dates ON ai_document_extractions(inspection_date, next_due_date);
CREATE INDEX IF NOT EXISTS idx_ai_extractions_verified ON ai_document_extractions(verified_by_user);

CREATE INDEX IF NOT EXISTS idx_ai_assignments_document ON document_ai_assignments(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_assignments_confidence ON document_ai_assignments(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_assignments_confirmed ON document_ai_assignments(user_confirmed);

-- Create triggers to automatically update document counts and dates
CREATE OR REPLACE FUNCTION update_compliance_asset_document_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update document count and latest upload date for the building_compliance_asset
    UPDATE building_compliance_assets 
    SET 
        document_count = (
            SELECT COUNT(*) 
            FROM compliance_documents 
            WHERE building_compliance_asset_id = COALESCE(NEW.building_compliance_asset_id, OLD.building_compliance_asset_id)
            AND is_current_version = true
        ),
        latest_upload_date = (
            SELECT MAX(upload_date) 
            FROM compliance_documents 
            WHERE building_compliance_asset_id = COALESCE(NEW.building_compliance_asset_id, OLD.building_compliance_asset_id)
        )
    WHERE id = COALESCE(NEW.building_compliance_asset_id, OLD.building_compliance_asset_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_document_stats_on_insert ON compliance_documents;
CREATE TRIGGER trigger_update_document_stats_on_insert
    AFTER INSERT ON compliance_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_compliance_asset_document_stats();

DROP TRIGGER IF EXISTS trigger_update_document_stats_on_update ON compliance_documents;
CREATE TRIGGER trigger_update_document_stats_on_update
    AFTER UPDATE ON compliance_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_compliance_asset_document_stats();

DROP TRIGGER IF EXISTS trigger_update_document_stats_on_delete ON compliance_documents;
CREATE TRIGGER trigger_update_document_stats_on_delete
    AFTER DELETE ON compliance_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_compliance_asset_document_stats();

-- Function to auto-update compliance asset fields from AI extractions
CREATE OR REPLACE FUNCTION update_asset_from_ai_extraction()
RETURNS TRIGGER AS $$
DECLARE
    asset_record RECORD;
    extraction_record RECORD;
BEGIN
    -- Get the extraction data
    SELECT * INTO extraction_record FROM ai_document_extractions WHERE id = NEW.id;
    
    -- Get the related compliance document and asset
    SELECT 
        cd.building_compliance_asset_id,
        cd.building_id
    INTO asset_record
    FROM compliance_documents cd 
    WHERE cd.id = extraction_record.document_id;
    
    -- Update the building_compliance_asset with extracted data (if fields are empty)
    UPDATE building_compliance_assets 
    SET 
        last_carried_out = COALESCE(last_carried_out, extraction_record.inspection_date),
        next_due_date = COALESCE(next_due_date, extraction_record.next_due_date),
        inspector_provider = COALESCE(inspector_provider, 
            CASE 
                WHEN extraction_record.inspector_company IS NOT NULL 
                THEN CONCAT(extraction_record.inspector_name, ' (', extraction_record.inspector_company, ')')
                ELSE extraction_record.inspector_name
            END
        ),
        certificate_reference = COALESCE(certificate_reference, extraction_record.certificate_number),
        status = CASE 
            WHEN extraction_record.compliance_status = 'Pass' THEN 'compliant'
            WHEN extraction_record.compliance_status = 'Fail' THEN 'overdue'
            WHEN extraction_record.compliance_status = 'Requires Action' THEN 'upcoming'
            ELSE status
        END
    WHERE id = asset_record.building_compliance_asset_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for AI extraction updates
DROP TRIGGER IF EXISTS trigger_update_asset_from_extraction ON ai_document_extractions;
CREATE TRIGGER trigger_update_asset_from_extraction
    AFTER INSERT OR UPDATE ON ai_document_extractions
    FOR EACH ROW
    EXECUTE FUNCTION update_asset_from_ai_extraction();

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.original_filename, '') || ' ' ||
        COALESCE(NEW.document_type, '') || ' ' ||
        COALESCE(NEW.document_category, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search vector updates
DROP TRIGGER IF EXISTS trigger_update_search_vector ON compliance_documents;
CREATE TRIGGER trigger_update_search_vector
    BEFORE INSERT OR UPDATE ON compliance_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_search_vector();

-- Add RLS (Row Level Security) policies
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_ai_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_document_relationships ENABLE ROW LEVEL SECURITY;

-- RLS policies for compliance_documents
CREATE POLICY "compliance_documents_select_policy" ON compliance_documents
    FOR SELECT USING (
        building_id IN (
            SELECT b.id FROM buildings b 
            WHERE b.user_id = auth.uid()
        )
    );

CREATE POLICY "compliance_documents_insert_policy" ON compliance_documents
    FOR INSERT WITH CHECK (
        building_id IN (
            SELECT b.id FROM buildings b 
            WHERE b.user_id = auth.uid()
        )
    );

CREATE POLICY "compliance_documents_update_policy" ON compliance_documents
    FOR UPDATE USING (
        building_id IN (
            SELECT b.id FROM buildings b 
            WHERE b.user_id = auth.uid()
        )
    );

CREATE POLICY "compliance_documents_delete_policy" ON compliance_documents
    FOR DELETE USING (
        building_id IN (
            SELECT b.id FROM buildings b 
            WHERE b.user_id = auth.uid()
        )
    );

-- RLS policies for ai_document_extractions
CREATE POLICY "ai_extractions_select_policy" ON ai_document_extractions
    FOR SELECT USING (
        document_id IN (
            SELECT cd.id FROM compliance_documents cd
            JOIN buildings b ON cd.building_id = b.id
            WHERE b.user_id = auth.uid()
        )
    );

CREATE POLICY "ai_extractions_insert_policy" ON ai_document_extractions
    FOR INSERT WITH CHECK (
        document_id IN (
            SELECT cd.id FROM compliance_documents cd
            JOIN buildings b ON cd.building_id = b.id
            WHERE b.user_id = auth.uid()
        )
    );

-- Similar policies for other tables...
CREATE POLICY "ai_assignments_select_policy" ON document_ai_assignments
    FOR SELECT USING (
        document_id IN (
            SELECT cd.id FROM compliance_documents cd
            JOIN buildings b ON cd.building_id = b.id
            WHERE b.user_id = auth.uid()
        )
    );

CREATE POLICY "doc_relationships_select_policy" ON compliance_document_relationships
    FOR SELECT USING (
        primary_document_id IN (
            SELECT cd.id FROM compliance_documents cd
            JOIN buildings b ON cd.building_id = b.id
            WHERE b.user_id = auth.uid()
        )
    );

-- Add some useful views for common queries
CREATE OR REPLACE VIEW compliance_documents_with_extractions AS
SELECT 
    cd.*,
    ade.inspection_date,
    ade.next_due_date as ai_next_due_date,
    ade.inspector_name,
    ade.inspector_company,
    ade.certificate_number,
    ade.compliance_status as ai_compliance_status,
    ade.verified_by_user,
    ade.extracted_data,
    ade.confidence_scores
FROM compliance_documents cd
LEFT JOIN ai_document_extractions ade ON cd.id = ade.document_id;

CREATE OR REPLACE VIEW building_compliance_summary AS
SELECT 
    bca.building_id,
    b.name as building_name,
    ca.name as asset_name,
    ca.category,
    bca.status,
    bca.next_due_date,
    bca.last_carried_out,
    bca.inspector_provider,
    bca.certificate_reference,
    bca.document_count,
    bca.latest_upload_date,
    CASE 
        WHEN bca.next_due_date IS NULL THEN 'not_scheduled'
        WHEN bca.next_due_date < CURRENT_DATE THEN 'overdue'
        WHEN bca.next_due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
        ELSE 'compliant'
    END as calculated_status
FROM building_compliance_assets bca
JOIN buildings b ON bca.building_id = b.id
JOIN compliance_assets ca ON bca.compliance_asset_id = ca.id;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_document_extractions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_ai_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_document_relationships TO authenticated;
GRANT SELECT ON compliance_documents_with_extractions TO authenticated;
GRANT SELECT ON building_compliance_summary TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE compliance_documents IS 'Stores uploaded compliance documents with AI classification and metadata';
COMMENT ON TABLE ai_document_extractions IS 'Stores AI-extracted data from compliance documents';
COMMENT ON TABLE document_ai_assignments IS 'Tracks AI suggestions for document-asset assignments';
COMMENT ON TABLE compliance_document_relationships IS 'Links related compliance documents together';

COMMENT ON COLUMN compliance_documents.document_type IS 'AI-classified document type (EICR, Gas Safety, Fire Risk Assessment, etc.)';
COMMENT ON COLUMN compliance_documents.document_category IS 'AI-classified document category (Current Certificate, Historical, Remedial Work, Photos)';
COMMENT ON COLUMN compliance_documents.ai_confidence_score IS 'AI confidence in classification (0.00-100.00)';
COMMENT ON COLUMN ai_document_extractions.extracted_data IS 'Full JSON of all extracted data points';
COMMENT ON COLUMN ai_document_extractions.confidence_scores IS 'JSON of confidence scores for each extracted field';