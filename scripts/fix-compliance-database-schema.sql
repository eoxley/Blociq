-- 🔧 Comprehensive Compliance Database Schema Fix
-- This script ensures all required tables exist for compliance asset management

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. COMPLIANCE ASSETS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS compliance_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    frequency_months INTEGER DEFAULT 12,
    is_required BOOLEAN DEFAULT true,
    is_hrb_related BOOLEAN DEFAULT false,
    priority VARCHAR(50) DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique names within categories
    UNIQUE(name, category)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_compliance_assets_category ON compliance_assets(category);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_required ON compliance_assets(is_required);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_hrb ON compliance_assets(is_hrb_related);

-- ========================================
-- 2. BUILDING COMPLIANCE ASSETS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS building_compliance_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id INTEGER NOT NULL,
    compliance_asset_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'Missing',
    last_carried_out DATE,
    next_due_date DATE,
    inspector_provider VARCHAR(255),
    certificate_reference VARCHAR(255),
    override_reason TEXT,
    notes TEXT,
    contractor VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key constraints
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
    FOREIGN KEY (compliance_asset_id) REFERENCES compliance_assets(id) ON DELETE CASCADE,
    
    -- Ensure unique asset per building
    UNIQUE(building_id, compliance_asset_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_building ON building_compliance_assets(building_id);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_asset ON building_compliance_assets(compliance_asset_id);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_status ON building_compliance_assets(status);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_due_date ON building_compliance_assets(next_due_date);

-- ========================================
-- 3. COMPLIANCE DOCUMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS compliance_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id INTEGER NOT NULL,
    building_compliance_asset_id UUID,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    document_type VARCHAR(100),
    document_category VARCHAR(100),
    ai_confidence_score DECIMAL(5,2),
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    processing_status VARCHAR(50) DEFAULT 'pending',
    is_current_version BOOLEAN DEFAULT true,
    uploaded_by UUID,
    
    -- Foreign key constraints
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
    FOREIGN KEY (building_compliance_asset_id) REFERENCES building_compliance_assets(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_compliance_documents_building ON compliance_documents(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_asset ON compliance_documents(building_compliance_asset_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_upload_date ON compliance_documents(upload_date);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_current ON compliance_documents(is_current_version);

-- ========================================
-- 4. AI DOCUMENT EXTRACTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS ai_document_extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    compliance_document_id UUID NOT NULL,
    inspection_date DATE,
    next_due_date DATE,
    inspector_name VARCHAR(255),
    inspector_company VARCHAR(255),
    certificate_number VARCHAR(255),
    compliance_status VARCHAR(100),
    extracted_data JSONB,
    confidence_score DECIMAL(5,2),
    verified_by_user BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key constraint
    FOREIGN KEY (compliance_document_id) REFERENCES compliance_documents(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_extractions_document ON ai_document_extractions(compliance_document_id);
CREATE INDEX IF NOT EXISTS idx_ai_extractions_due_date ON ai_document_extractions(next_due_date);
CREATE INDEX IF NOT EXISTS idx_ai_extractions_verified ON ai_document_extractions(verified_by_user);

-- ========================================
-- 5. INSERT DEFAULT COMPLIANCE ASSETS
-- ========================================

-- Fire Safety Assets
INSERT INTO compliance_assets (name, category, description, frequency_months, is_required, is_hrb_related) VALUES
('Fire Risk Assessment', 'fire_safety', 'Comprehensive assessment of fire risks and safety measures', 12, true, false),
('Fire Alarm System Test', 'fire_safety', 'Testing and maintenance of fire alarm systems', 12, true, false),
('Emergency Lighting Test', 'fire_safety', 'Testing of emergency lighting systems', 12, true, false),
('Fire Extinguisher Service', 'fire_safety', 'Annual service and maintenance of fire extinguishers', 12, true, false),
('Fire Door Inspection', 'fire_safety', 'Inspection of fire doors and seals', 12, true, false)
ON CONFLICT (name, category) DO NOTHING;

-- Electrical Safety Assets
INSERT INTO compliance_assets (name, category, description, frequency_months, is_required, is_hrb_related) VALUES
('Electrical Installation Condition Report (EICR)', 'electrical', 'Comprehensive electrical safety inspection', 60, true, false),
('PAT Testing', 'electrical', 'Portable Appliance Testing for electrical equipment', 12, true, false),
('Lightning Protection Test', 'electrical', 'Testing of lightning protection systems', 12, false, false)
ON CONFLICT (name, category) DO NOTHING;

-- Gas Safety Assets
INSERT INTO compliance_assets (name, category, description, frequency_months, is_required, is_hrb_related) VALUES
('Gas Safety Certificate', 'gas_safety', 'Annual gas safety inspection and certification', 12, true, false),
('Commercial Gas Safety Check', 'gas_safety', 'Commercial gas appliance safety inspection', 12, false, false)
ON CONFLICT (name, category) DO NOTHING;

-- Water Safety Assets
INSERT INTO compliance_assets (name, category, description, frequency_months, is_required, is_hrb_related) VALUES
('Legionella Risk Assessment', 'water_safety', 'Assessment of legionella risks in water systems', 24, true, false),
('Water Tank Cleaning', 'water_safety', 'Cleaning and disinfection of water storage tanks', 12, true, false),
('Water Temperature Monitoring', 'water_safety', 'Regular monitoring of water temperatures', 1, true, false)
ON CONFLICT (name, category) DO NOTHING;

-- Lift Safety Assets
INSERT INTO compliance_assets (name, category, description, frequency_months, is_required, is_hrb_related) VALUES
('Lift Safety Inspection', 'lift_safety', 'Comprehensive lift safety inspection and certification', 6, false, false),
('Lift Insurance Inspection', 'lift_safety', 'Insurance-required lift inspection', 12, false, false)
ON CONFLICT (name, category) DO NOTHING;

-- Building Safety Act (HRB) Assets
INSERT INTO compliance_assets (name, category, description, frequency_months, is_required, is_hrb_related) VALUES
('Building Safety Case Report', 'building_safety', 'Comprehensive building safety case for HRB', 12, true, true),
('Resident Engagement Strategy', 'building_safety', 'Strategy for engaging with residents on safety matters', 12, true, true),
('Safety Management System', 'building_safety', 'Implementation and maintenance of safety management system', 6, true, true),
('External Wall System Assessment', 'building_safety', 'Assessment of external wall systems and fire safety', 12, true, true)
ON CONFLICT (name, category) DO NOTHING;

-- General Compliance Assets
INSERT INTO compliance_assets (name, category, description, frequency_months, is_required, is_hrb_related) VALUES
('Asbestos Survey', 'general', 'Survey for presence of asbestos materials', 36, false, false),
('Energy Performance Certificate', 'general', 'Energy efficiency assessment and certification', 120, false, false),
('Insurance Valuation', 'general', 'Building insurance valuation assessment', 36, true, false),
('Health & Safety Risk Assessment', 'general', 'General health and safety risk assessment', 12, true, false)
ON CONFLICT (name, category) DO NOTHING;

-- ========================================
-- 6. CREATE TRIGGERS FOR UPDATED_AT
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updating updated_at
DROP TRIGGER IF EXISTS update_compliance_assets_updated_at ON compliance_assets;
CREATE TRIGGER update_compliance_assets_updated_at
    BEFORE UPDATE ON compliance_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_building_compliance_assets_updated_at ON building_compliance_assets;
CREATE TRIGGER update_building_compliance_assets_updated_at
    BEFORE UPDATE ON building_compliance_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ========================================

-- Enable RLS on all tables
ALTER TABLE compliance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_compliance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_document_extractions ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
-- Compliance Assets - Read access for all authenticated users
DROP POLICY IF EXISTS "compliance_assets_select_policy" ON compliance_assets;
CREATE POLICY "compliance_assets_select_policy"
    ON compliance_assets FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Building Compliance Assets - Users can access assets for their buildings
DROP POLICY IF EXISTS "building_compliance_assets_policy" ON building_compliance_assets;
CREATE POLICY "building_compliance_assets_policy"
    ON building_compliance_assets FOR ALL
    USING (
        auth.uid() IS NOT NULL AND
        building_id IN (
            SELECT b.id FROM buildings b
            JOIN agency_members am ON am.agency_id = b.agency_id
            WHERE am.user_id = auth.uid()
        )
    );

-- Compliance Documents - Users can access documents for their buildings
DROP POLICY IF EXISTS "compliance_documents_policy" ON compliance_documents;
CREATE POLICY "compliance_documents_policy"
    ON compliance_documents FOR ALL
    USING (
        auth.uid() IS NOT NULL AND
        building_id IN (
            SELECT b.id FROM buildings b
            JOIN agency_members am ON am.agency_id = b.agency_id
            WHERE am.user_id = auth.uid()
        )
    );

-- AI Document Extractions - Access through document ownership
DROP POLICY IF EXISTS "ai_extractions_policy" ON ai_document_extractions;
CREATE POLICY "ai_extractions_policy"
    ON ai_document_extractions FOR ALL
    USING (
        auth.uid() IS NOT NULL AND
        compliance_document_id IN (
            SELECT cd.id FROM compliance_documents cd
            JOIN buildings b ON b.id = cd.building_id
            JOIN agency_members am ON am.agency_id = b.agency_id
            WHERE am.user_id = auth.uid()
        )
    );

-- ========================================
-- 8. VERIFICATION QUERIES
-- ========================================

-- Check if all tables exist
SELECT 
    'compliance_assets' as table_name,
    EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'compliance_assets') as exists
UNION ALL
SELECT 
    'building_compliance_assets' as table_name,
    EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'building_compliance_assets') as exists
UNION ALL
SELECT 
    'compliance_documents' as table_name,
    EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'compliance_documents') as exists
UNION ALL
SELECT 
    'ai_document_extractions' as table_name,
    EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_document_extractions') as exists;

-- Count default assets inserted
SELECT 
    category,
    COUNT(*) as asset_count
FROM compliance_assets 
GROUP BY category
ORDER BY category;

-- Final success message
SELECT 'Compliance database schema setup completed successfully!' as status;
