-- =====================================================
-- MIH Agency Setup Script
-- Creates MIH as a real agency client with data isolation
-- =====================================================

-- 1. Create agencies table if it doesn't exist
CREATE TABLE IF NOT EXISTS agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert MIH Agency
INSERT INTO agencies (id, name, domain) VALUES (
    '550e8400-e29b-41d4-a716-446655440001', -- Fixed UUID for MIH
    'MIH Property Management',
    'mihproperty.co.uk'
) ON CONFLICT (domain) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- 3. Add agency_id column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- 4. Add agency_id column to buildings table if it doesn't exist
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- 5. Add agency_id column to units table if it doesn't exist
ALTER TABLE units ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- 6. Add agency_id column to leases table if it doesn't exist
ALTER TABLE leases ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- 7. Add agency_id column to incoming_emails table if it doesn't exist
ALTER TABLE incoming_emails ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- 8. Add agency_id column to documents table if it doesn't exist
ALTER TABLE documents ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- 9. Add agency_id column to compliance_assets table if it doesn't exist
ALTER TABLE compliance_assets ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- 10. Add agency_id column to building_compliance_assets table if it doesn't exist
ALTER TABLE building_compliance_assets ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id);

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_agency_id ON users(agency_id);
CREATE INDEX IF NOT EXISTS idx_buildings_agency_id ON buildings(agency_id);
CREATE INDEX IF NOT EXISTS idx_units_agency_id ON units(agency_id);
CREATE INDEX IF NOT EXISTS idx_leases_agency_id ON leases(agency_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_agency_id ON incoming_emails(agency_id);
CREATE INDEX IF NOT EXISTS idx_documents_agency_id ON documents(agency_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_agency_id ON compliance_assets(agency_id);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_agency_id ON building_compliance_assets(agency_id);

-- 12. Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE incoming_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_compliance_assets ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS policies for users table
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- 14. Create RLS policies for buildings table
DROP POLICY IF EXISTS "Users can access buildings in their agency" ON buildings;
CREATE POLICY "Users can access buildings in their agency" ON buildings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.agency_id = buildings.agency_id
        )
    );

-- 15. Create RLS policies for units table
DROP POLICY IF EXISTS "Users can access units in their agency" ON units;
CREATE POLICY "Users can access units in their agency" ON units
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.agency_id = units.agency_id
        )
    );

-- 16. Create RLS policies for leases table
DROP POLICY IF EXISTS "Users can access leases in their agency" ON leases;
CREATE POLICY "Users can access leases in their agency" ON leases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.agency_id = leases.agency_id
        )
    );

-- 17. Create RLS policies for incoming_emails table
DROP POLICY IF EXISTS "Users can access emails in their agency" ON incoming_emails;
CREATE POLICY "Users can access emails in their agency" ON incoming_emails
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.agency_id = incoming_emails.agency_id
        )
    );

-- 18. Create RLS policies for documents table
DROP POLICY IF EXISTS "Users can access documents in their agency" ON documents;
CREATE POLICY "Users can access documents in their agency" ON documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.agency_id = documents.agency_id
        )
    );

-- 19. Create RLS policies for compliance_assets table
DROP POLICY IF EXISTS "Users can access compliance assets in their agency" ON compliance_assets;
CREATE POLICY "Users can access compliance assets in their agency" ON compliance_assets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.agency_id = compliance_assets.agency_id
        )
    );

-- 20. Create RLS policies for building_compliance_assets table
DROP POLICY IF EXISTS "Users can access building compliance assets in their agency" ON building_compliance_assets;
CREATE POLICY "Users can access building compliance assets in their agency" ON building_compliance_assets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.agency_id = building_compliance_assets.agency_id
        )
    );

-- 21. Create function to automatically set agency_id based on user email domain
CREATE OR REPLACE FUNCTION set_user_agency_from_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract domain from email
    IF NEW.email IS NOT NULL THEN
        -- Try to match domain to agency
        UPDATE users 
        SET agency_id = (
            SELECT id FROM agencies 
            WHERE domain = split_part(NEW.email, '@', 2)
        )
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 22. Create trigger to automatically set agency_id when user is created
DROP TRIGGER IF EXISTS trigger_set_user_agency ON auth.users;
CREATE TRIGGER trigger_set_user_agency
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION set_user_agency_from_email();

-- 23. Create function to automatically set agency_id for new records
CREATE OR REPLACE FUNCTION set_agency_id_from_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.agency_id IS NULL THEN
        NEW.agency_id = (
            SELECT agency_id FROM users WHERE id = auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 24. Create triggers for automatic agency_id setting
DROP TRIGGER IF EXISTS trigger_set_building_agency ON buildings;
CREATE TRIGGER trigger_set_building_agency
    BEFORE INSERT ON buildings
    FOR EACH ROW
    EXECUTE FUNCTION set_agency_id_from_user();

DROP TRIGGER IF EXISTS trigger_set_unit_agency ON units;
CREATE TRIGGER trigger_set_unit_agency
    BEFORE INSERT ON units
    FOR EACH ROW
    EXECUTE FUNCTION set_agency_id_from_user();

DROP TRIGGER IF EXISTS trigger_set_lease_agency ON leases;
CREATE TRIGGER trigger_set_lease_agency
    BEFORE INSERT ON leases
    FOR EACH ROW
    EXECUTE FUNCTION set_agency_id_from_user();

DROP TRIGGER IF EXISTS trigger_set_email_agency ON incoming_emails;
CREATE TRIGGER trigger_set_email_agency
    BEFORE INSERT ON incoming_emails
    FOR EACH ROW
    EXECUTE FUNCTION set_agency_id_from_user();

DROP TRIGGER IF EXISTS trigger_set_document_agency ON documents;
CREATE TRIGGER trigger_set_document_agency
    BEFORE INSERT ON documents
    FOR EACH ROW
    EXECUTE FUNCTION set_agency_id_from_user();

-- 25. Create function to get user's agency
CREATE OR REPLACE FUNCTION get_user_agency()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT agency_id FROM users WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 26. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 27. Create MIH buildings (to be populated tomorrow)
-- This creates the structure but leaves the actual building data empty
-- The buildings will be added via the application tomorrow

-- 28. Update existing records to have agency_id (if any exist)
-- This is a safety measure for any existing data
UPDATE buildings SET agency_id = (
    SELECT id FROM agencies WHERE domain = 'blociq.co.uk'
) WHERE agency_id IS NULL;

-- 29. Create a view for agency-scoped data
CREATE OR REPLACE VIEW agency_buildings AS
SELECT b.*, a.name as agency_name, a.domain as agency_domain
FROM buildings b
JOIN agencies a ON b.agency_id = a.id
WHERE EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.agency_id = b.agency_id
);

-- 30. Grant access to the view
GRANT SELECT ON agency_buildings TO authenticated;

-- =====================================================
-- Setup Complete!
-- =====================================================

-- Verify the setup
SELECT 
    'MIH Agency Setup Complete' as status,
    (SELECT name FROM agencies WHERE domain = 'mihproperty.co.uk') as agency_name,
    (SELECT COUNT(*) FROM agencies) as total_agencies,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%agency%') as agency_related_tables;

-- Show RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'buildings', 'units', 'leases', 'incoming_emails', 'documents', 'compliance_assets', 'building_compliance_assets');
