-- 🔐 Fix RLS & Auth Errors with JWT Claims
-- This migration creates proper RLS policies using JWT claims for agency-based access control
-- Fixes 401, 406, and 500 errors from API endpoints

BEGIN;

-- ========================================
-- 1. ENABLE RLS ON ALL CRITICAL TABLES
-- ========================================

-- Enable RLS on tables that might be missing it
ALTER TABLE public.lease_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlook_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incoming_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaseholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_compliance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_document_jobs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. DROP EXISTING INCONSISTENT POLICIES
-- ========================================

-- Drop all existing policies to start fresh
DO $$
DECLARE
    table_name text;
    policy_name text;
    tables_to_clean text[] := ARRAY[
        'lease_processing_jobs', 'outlook_tokens', 'users', 'buildings', 
        'incoming_emails', 'leaseholders', 'units', 'building_todos', 
        'property_events', 'compliance_assets', 'building_compliance_assets',
        'compliance_documents', 'compliance_document_jobs'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_clean
    LOOP
        -- Drop all existing policies for each table
        FOR policy_name IN 
            SELECT policyname FROM pg_policies 
            WHERE tablename = table_name AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
        END LOOP;
    END LOOP;
END $$;

-- ========================================
-- 3. CREATE JWT HELPER FUNCTIONS
-- ========================================

-- Function to get user's agency_id from JWT claims
CREATE OR REPLACE FUNCTION public.get_user_agency_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (current_setting('request.jwt.claims', true)::json->>'agency_id')::uuid;
END;
$$;

-- Function to get user's user_id from JWT claims
CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
END;
$$;

-- Function to check if user has access to a building via agency
CREATE OR REPLACE FUNCTION public.user_has_agency_building_access(building_id_param INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_agency_id UUID;
BEGIN
    -- Get user's agency_id from JWT
    user_agency_id := public.get_user_agency_id();
    
    -- If no agency_id in JWT, deny access
    IF user_agency_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if building belongs to user's agency
    RETURN EXISTS (
        SELECT 1 FROM public.buildings
        WHERE id = building_id_param
        AND agency_id = user_agency_id
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_agency_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_agency_building_access(INTEGER) TO authenticated;

-- ========================================
-- 4. CREATE COMPREHENSIVE RLS POLICIES
-- ========================================

-- Buildings policies
CREATE POLICY "Users can view buildings in their agency"
ON public.buildings
FOR SELECT USING (
    agency_id = public.get_user_agency_id()
);

CREATE POLICY "Users can update buildings in their agency"
ON public.buildings
FOR UPDATE USING (
    agency_id = public.get_user_agency_id()
);

CREATE POLICY "Users can insert buildings in their agency"
ON public.buildings
FOR INSERT WITH CHECK (
    agency_id = public.get_user_agency_id()
);

-- Units policies
CREATE POLICY "Users can view units in their agency buildings"
ON public.units
FOR SELECT USING (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can update units in their agency buildings"
ON public.units
FOR UPDATE USING (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can insert units in their agency buildings"
ON public.units
FOR INSERT WITH CHECK (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

-- Leaseholders policies
CREATE POLICY "Users can view leaseholders in their agency buildings"
ON public.leaseholders
FOR SELECT USING (
    unit_id IN (
        SELECT u.id FROM public.units u
        JOIN public.buildings b ON u.building_id = b.id
        WHERE b.agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can update leaseholders in their agency buildings"
ON public.leaseholders
FOR UPDATE USING (
    unit_id IN (
        SELECT u.id FROM public.units u
        JOIN public.buildings b ON u.building_id = b.id
        WHERE b.agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can insert leaseholders in their agency buildings"
ON public.leaseholders
FOR INSERT WITH CHECK (
    unit_id IN (
        SELECT u.id FROM public.units u
        JOIN public.buildings b ON u.building_id = b.id
        WHERE b.agency_id = public.get_user_agency_id()
    )
);

-- Incoming emails policies
CREATE POLICY "Users can view emails for their agency buildings"
ON public.incoming_emails
FOR SELECT USING (
    building_id IS NULL OR
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can update emails for their agency buildings"
ON public.incoming_emails
FOR UPDATE USING (
    building_id IS NULL OR
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can insert emails for their agency buildings"
ON public.incoming_emails
FOR INSERT WITH CHECK (
    building_id IS NULL OR
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

-- Building todos policies
CREATE POLICY "Users can view todos for their agency buildings"
ON public.building_todos
FOR SELECT USING (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can update todos for their agency buildings"
ON public.building_todos
FOR UPDATE USING (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can insert todos for their agency buildings"
ON public.building_todos
FOR INSERT WITH CHECK (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

-- Property events policies
CREATE POLICY "Users can view events for their agency buildings"
ON public.property_events
FOR SELECT USING (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can update events for their agency buildings"
ON public.property_events
FOR UPDATE USING (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can insert events for their agency buildings"
ON public.property_events
FOR INSERT WITH CHECK (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

-- Lease processing jobs policies
CREATE POLICY "Users can view lease jobs for their agency buildings"
ON public.lease_processing_jobs
FOR SELECT USING (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can update lease jobs for their agency buildings"
ON public.lease_processing_jobs
FOR UPDATE USING (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can insert lease jobs for their agency buildings"
ON public.lease_processing_jobs
FOR INSERT WITH CHECK (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

-- Outlook tokens policies
CREATE POLICY "Users can view their own tokens"
ON public.outlook_tokens
FOR SELECT USING (
    user_id = public.get_user_id()
);

CREATE POLICY "Users can update their own tokens"
ON public.outlook_tokens
FOR UPDATE USING (
    user_id = public.get_user_id()
);

CREATE POLICY "Users can insert their own tokens"
ON public.outlook_tokens
FOR INSERT WITH CHECK (
    user_id = public.get_user_id()
);

-- Users policies
CREATE POLICY "Users can view users in their agency"
ON public.users
FOR SELECT USING (
    agency_id = public.get_user_agency_id()
);

CREATE POLICY "Users can update users in their agency"
ON public.users
FOR UPDATE USING (
    agency_id = public.get_user_agency_id()
);

CREATE POLICY "Users can insert users in their agency"
ON public.users
FOR INSERT WITH CHECK (
    agency_id = public.get_user_agency_id()
);

-- Compliance assets policies
CREATE POLICY "Users can view compliance assets for their agency buildings"
ON public.compliance_assets
FOR SELECT USING (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can update compliance assets for their agency buildings"
ON public.compliance_assets
FOR UPDATE USING (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can insert compliance assets for their agency buildings"
ON public.compliance_assets
FOR INSERT WITH CHECK (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

-- Building compliance assets policies
CREATE POLICY "Users can view building compliance for their agency buildings"
ON public.building_compliance_assets
FOR SELECT USING (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can update building compliance for their agency buildings"
ON public.building_compliance_assets
FOR UPDATE USING (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can insert building compliance for their agency buildings"
ON public.building_compliance_assets
FOR INSERT WITH CHECK (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

-- Compliance documents policies
CREATE POLICY "Users can view compliance documents for their agency buildings"
ON public.compliance_documents
FOR SELECT USING (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can update compliance documents for their agency buildings"
ON public.compliance_documents
FOR UPDATE USING (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can insert compliance documents for their agency buildings"
ON public.compliance_documents
FOR INSERT WITH CHECK (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

-- Compliance document jobs policies
CREATE POLICY "Users can view compliance jobs for their agency buildings"
ON public.compliance_document_jobs
FOR SELECT USING (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can update compliance jobs for their agency buildings"
ON public.compliance_document_jobs
FOR UPDATE USING (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

CREATE POLICY "Users can insert compliance jobs for their agency buildings"
ON public.compliance_document_jobs
FOR INSERT WITH CHECK (
    building_id IN (
        SELECT id FROM public.buildings
        WHERE agency_id = public.get_user_agency_id()
    )
);

-- ========================================
-- 5. GRANT NECESSARY PERMISSIONS
-- ========================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ========================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Create indexes to improve RLS policy performance
CREATE INDEX IF NOT EXISTS idx_buildings_agency_id ON public.buildings(agency_id);
CREATE INDEX IF NOT EXISTS idx_units_building_id ON public.units(building_id);
CREATE INDEX IF NOT EXISTS idx_leaseholders_unit_id ON public.leaseholders(unit_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_building_id ON public.incoming_emails(building_id);
CREATE INDEX IF NOT EXISTS idx_building_todos_building_id ON public.building_todos(building_id);
CREATE INDEX IF NOT EXISTS idx_property_events_building_id ON public.property_events(building_id);
CREATE INDEX IF NOT EXISTS idx_lease_processing_jobs_building_id ON public.lease_processing_jobs(building_id);
CREATE INDEX IF NOT EXISTS idx_outlook_tokens_user_id ON public.outlook_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_users_agency_id ON public.users(agency_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_building_id ON public.compliance_assets(building_id);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_building_id ON public.building_compliance_assets(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_building_id ON public.compliance_documents(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_document_jobs_building_id ON public.compliance_document_jobs(building_id);

-- ========================================
-- 7. LOG SUCCESS
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies created successfully using JWT claims';
    RAISE NOTICE '✅ All tables now have proper agency-based access control';
    RAISE NOTICE '✅ 401, 406, and 500 errors should be resolved';
    RAISE NOTICE '✅ Performance indexes created for RLS policies';
END $$;

COMMIT;
