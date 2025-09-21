-- Portal-specific RLS policies for leaseholder access

-- Enable RLS on all relevant tables
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_jobs ENABLE ROW LEVEL SECURITY;

-- Create portal access function
CREATE OR REPLACE FUNCTION portal_has_lease_access(lease_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    building_id UUID;
    has_access BOOLEAN := FALSE;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get building_id for the lease
    SELECT l.building_id INTO building_id
    FROM leases l
    WHERE l.id = lease_id;

    IF building_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if user has access via building_access table
    SELECT EXISTS(
        SELECT 1 FROM building_access ba
        WHERE ba.building_id = building_id
        AND ba.user_id = current_user_id
        AND ba.role IN ('owner', 'manager', 'viewer')
    ) INTO has_access;

    IF has_access THEN
        RETURN TRUE;
    END IF;

    -- Check if user created the building
    SELECT EXISTS(
        SELECT 1 FROM buildings b
        WHERE b.id = building_id
        AND b.created_by = current_user_id
    ) INTO has_access;

    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create building access function
CREATE OR REPLACE FUNCTION portal_has_building_access(building_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    has_access BOOLEAN := FALSE;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if user has access via building_access table
    SELECT EXISTS(
        SELECT 1 FROM building_access ba
        WHERE ba.building_id = building_id
        AND ba.user_id = current_user_id
        AND ba.role IN ('owner', 'manager', 'viewer')
    ) INTO has_access;

    IF has_access THEN
        RETURN TRUE;
    END IF;

    -- Check if user created the building
    SELECT EXISTS(
        SELECT 1 FROM buildings b
        WHERE b.id = building_id
        AND b.created_by = current_user_id
    ) INTO has_access;

    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for leases table
DROP POLICY IF EXISTS "Users can view leases they have access to" ON leases;
CREATE POLICY "Users can view leases they have access to" ON leases
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            portal_has_building_access(building_id) OR
            portal_has_lease_access(id)
        )
    );

DROP POLICY IF EXISTS "Users can insert leases for buildings they have access to" ON leases;
CREATE POLICY "Users can insert leases for buildings they have access to" ON leases
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        portal_has_building_access(building_id)
    );

DROP POLICY IF EXISTS "Users can update leases they have access to" ON leases;
CREATE POLICY "Users can update leases they have access to" ON leases
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        portal_has_building_access(building_id)
    );

-- RLS Policies for buildings table
DROP POLICY IF EXISTS "Users can view buildings they have access to" ON buildings;
CREATE POLICY "Users can view buildings they have access to" ON buildings
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            portal_has_building_access(id) OR
            created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert buildings" ON buildings;
CREATE POLICY "Users can insert buildings" ON buildings
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update buildings they own or manage" ON buildings;
CREATE POLICY "Users can update buildings they own or manage" ON buildings
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            created_by = auth.uid() OR
            EXISTS(
                SELECT 1 FROM building_access ba
                WHERE ba.building_id = id
                AND ba.user_id = auth.uid()
                AND ba.role IN ('owner', 'manager')
            )
        )
    );

-- RLS Policies for units table
DROP POLICY IF EXISTS "Users can view units in buildings they have access to" ON units;
CREATE POLICY "Users can view units in buildings they have access to" ON units
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        portal_has_building_access(building_id)
    );

DROP POLICY IF EXISTS "Users can insert units in buildings they have access to" ON units;
CREATE POLICY "Users can insert units in buildings they have access to" ON units
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        portal_has_building_access(building_id)
    );

DROP POLICY IF EXISTS "Users can update units in buildings they have access to" ON units;
CREATE POLICY "Users can update units in buildings they have access to" ON units
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        portal_has_building_access(building_id)
    );

-- RLS Policies for communications_log table
DROP POLICY IF EXISTS "Users can view communications for buildings they have access to" ON communications_log;
CREATE POLICY "Users can view communications for buildings they have access to" ON communications_log
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            (building_id IS NOT NULL AND portal_has_building_access(building_id)) OR
            sent_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert communications for buildings they have access to" ON communications_log;
CREATE POLICY "Users can insert communications for buildings they have access to" ON communications_log
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND (
            (building_id IS NOT NULL AND portal_has_building_access(building_id)) OR
            sent_by = auth.uid()
        )
    );

-- RLS Policies for building_documents table
DROP POLICY IF EXISTS "Users can view building documents they have access to" ON building_documents;
CREATE POLICY "Users can view building documents they have access to" ON building_documents
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        portal_has_building_access(building_id)
    );

DROP POLICY IF EXISTS "Users can insert building documents for buildings they have access to" ON building_documents;
CREATE POLICY "Users can insert building documents for buildings they have access to" ON building_documents
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        portal_has_building_access(building_id)
    );

-- RLS Policies for compliance_documents table
DROP POLICY IF EXISTS "Users can view compliance documents for buildings they have access to" ON compliance_documents;
CREATE POLICY "Users can view compliance documents for buildings they have access to" ON compliance_documents
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        portal_has_building_access(building_id)
    );

DROP POLICY IF EXISTS "Users can insert compliance documents for buildings they have access to" ON compliance_documents;
CREATE POLICY "Users can insert compliance documents for buildings they have access to" ON compliance_documents
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        portal_has_building_access(building_id)
    );

-- RLS Policies for document_jobs table
DROP POLICY IF EXISTS "Users can view document jobs they created or have building access to" ON document_jobs;
CREATE POLICY "Users can view document jobs they created or have building access to" ON document_jobs
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            user_id = auth.uid() OR
            (building_id IS NOT NULL AND portal_has_building_access(building_id))
        )
    );

DROP POLICY IF EXISTS "Users can insert their own document jobs" ON document_jobs;
CREATE POLICY "Users can insert their own document jobs" ON document_jobs
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update document jobs they created" ON document_jobs;
CREATE POLICY "Users can update document jobs they created" ON document_jobs
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        user_id = auth.uid()
    );

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION portal_has_lease_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION portal_has_building_access(UUID) TO authenticated;