-- ========================================
-- LEASEHOLDER PORTAL AUTHENTICATION MIGRATION
-- Date: 2024-12-21
-- Description: Extend authentication system for leaseholder portal access
-- ========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. UPDATE PROFILES TABLE WITH ROLE CONSTRAINT
-- ========================================

-- Add role column with check constraint if it doesn't exist
DO $$
BEGIN
    -- Check if role column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'staff';
    END IF;

    -- Update existing records to have appropriate roles
    UPDATE profiles SET role = 'manager' WHERE role IS NULL OR role = '';
    
    -- Add check constraint for valid roles
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('manager', 'staff', 'leaseholder', 'director'));
    END IF;
END $$;

-- ========================================
-- 2. CREATE LEASEHOLDER_USERS JOIN TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS leaseholder_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    leaseholder_id UUID NOT NULL REFERENCES leaseholders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one user can only be linked to one leaseholder
    UNIQUE(user_id),
    -- Ensure one leaseholder can only have one user account
    UNIQUE(leaseholder_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_leaseholder_users_user_id ON leaseholder_users(user_id);
CREATE INDEX IF NOT EXISTS idx_leaseholder_users_leaseholder_id ON leaseholder_users(leaseholder_id);

-- Add RLS
ALTER TABLE leaseholder_users ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 3. UPDATE LEASEHOLDERS TABLE FOR PORTAL ACCESS
-- ========================================

-- Add columns to leaseholders table if they don't exist
DO $$
BEGIN
    -- Add email column for portal access if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leaseholders' AND column_name = 'email'
    ) THEN
        ALTER TABLE leaseholders ADD COLUMN email VARCHAR(255);
    END IF;
    
    -- Add portal_enabled flag
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leaseholders' AND column_name = 'portal_enabled'
    ) THEN
        ALTER TABLE leaseholders ADD COLUMN portal_enabled BOOLEAN DEFAULT false;
    END IF;
    
    -- Add last_portal_access timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leaseholders' AND column_name = 'last_portal_access'
    ) THEN
        ALTER TABLE leaseholders ADD COLUMN last_portal_access TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- ========================================
-- 4. CREATE PORTAL ACCESS FUNCTIONS
-- ========================================

-- Function to check if user has lease access (for leaseholders)
CREATE OR REPLACE FUNCTION portal_has_lease_access(user_id UUID, lease_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    leaseholder_record RECORD;
BEGIN
    -- Get user role from profiles
    SELECT role INTO user_role 
    FROM profiles 
    WHERE id = user_id;
    
    -- If no profile found, deny access
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Directors can access all leases in their buildings
    IF user_role = 'director' THEN
        RETURN portal_has_building_access(user_id, (
            SELECT building_id FROM leases WHERE id = lease_id
        ));
    END IF;
    
    -- Leaseholders can only access their own lease
    IF user_role = 'leaseholder' THEN
        -- Check if user is linked to a leaseholder that has this lease
        SELECT l.* INTO leaseholder_record
        FROM leaseholder_users lu
        JOIN leaseholders l ON l.id = lu.leaseholder_id
        JOIN units u ON u.id = l.unit_id
        JOIN leases le ON le.unit_id = u.id
        WHERE lu.user_id = user_id 
        AND le.id = lease_id
        AND l.portal_enabled = true;
        
        RETURN leaseholder_record.id IS NOT NULL;
    END IF;
    
    -- Managers and staff can access leases in their agency buildings
    IF user_role IN ('manager', 'staff') THEN
        RETURN portal_has_building_access(user_id, (
            SELECT building_id FROM leases WHERE id = lease_id
        ));
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has building access
CREATE OR REPLACE FUNCTION portal_has_building_access(user_id UUID, building_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    agency_id UUID;
BEGIN
    -- Get user role and agency
    SELECT role, agency_id INTO user_role, agency_id
    FROM profiles 
    WHERE id = user_id;
    
    -- If no profile found, deny access
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Directors can access all buildings in their agency
    IF user_role = 'director' THEN
        RETURN EXISTS (
            SELECT 1 FROM buildings 
            WHERE id = building_id 
            AND agency_id = agency_id
        );
    END IF;
    
    -- Managers and staff can access buildings in their agency
    IF user_role IN ('manager', 'staff') THEN
        RETURN EXISTS (
            SELECT 1 FROM buildings 
            WHERE id = building_id 
            AND agency_id = agency_id
        );
    END IF;
    
    -- Leaseholders can access buildings where they have a unit
    IF user_role = 'leaseholder' THEN
        RETURN EXISTS (
            SELECT 1 FROM leaseholder_users lu
            JOIN leaseholders l ON l.id = lu.leaseholder_id
            JOIN units u ON u.id = l.unit_id
            WHERE lu.user_id = user_id 
            AND u.building_id = building_id
            AND l.portal_enabled = true
        );
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. UPDATE RLS POLICIES FOR LEASEHOLDER ACCESS
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view leases they have access to" ON leases;
DROP POLICY IF EXISTS "Users can view buildings they have access to" ON buildings;
DROP POLICY IF EXISTS "Users can view communications for their buildings" ON communications_log;
DROP POLICY IF EXISTS "Users can view building documents for their buildings" ON building_documents;
DROP POLICY IF EXISTS "Users can view compliance documents for their buildings" ON compliance_documents;

-- New RLS policies for leases
CREATE POLICY "Portal access control for leases" ON leases
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        portal_has_lease_access(auth.uid(), id)
    );

CREATE POLICY "Portal access control for leases insert" ON leases
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        portal_has_building_access(auth.uid(), building_id)
    );

CREATE POLICY "Portal access control for leases update" ON leases
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        portal_has_building_access(auth.uid(), building_id)
    );

-- New RLS policies for buildings
CREATE POLICY "Portal access control for buildings" ON buildings
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        portal_has_building_access(auth.uid(), id)
    );

-- New RLS policies for communications_log
CREATE POLICY "Portal access control for communications_log" ON communications_log
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            portal_has_building_access(auth.uid(), building_id) OR
            (leaseholder_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM leaseholder_users lu
                JOIN leaseholders l ON l.id = lu.leaseholder_id
                WHERE lu.user_id = auth.uid() 
                AND l.id = leaseholder_id
                AND l.portal_enabled = true
            ))
        )
    );

-- New RLS policies for building_documents
CREATE POLICY "Portal access control for building_documents" ON building_documents
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        portal_has_building_access(auth.uid(), building_id)
    );

-- New RLS policies for compliance_documents
CREATE POLICY "Portal access control for compliance_documents" ON compliance_documents
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        portal_has_building_access(auth.uid(), building_id)
    );

-- RLS policies for leaseholder_users table
CREATE POLICY "Users can view their own leaseholder_user record" ON leaseholder_users
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own leaseholder_user record" ON leaseholder_users
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ========================================
-- 6. CREATE TRIGGERS FOR UPDATED_AT
-- ========================================

-- Trigger for leaseholder_users updated_at
CREATE OR REPLACE FUNCTION update_leaseholder_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leaseholder_users_updated_at
    BEFORE UPDATE ON leaseholder_users
    FOR EACH ROW
    EXECUTE FUNCTION update_leaseholder_users_updated_at();

-- ========================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE leaseholder_users IS 'Links auth.users to leaseholders for portal access';
COMMENT ON COLUMN leaseholder_users.user_id IS 'Reference to auth.users table';
COMMENT ON COLUMN leaseholder_users.leaseholder_id IS 'Reference to leaseholders table';
COMMENT ON COLUMN leaseholders.portal_enabled IS 'Whether this leaseholder has portal access enabled';
COMMENT ON COLUMN leaseholders.last_portal_access IS 'Timestamp of last portal login';

COMMENT ON FUNCTION portal_has_lease_access(UUID, UUID) IS 'Checks if user has access to specific lease based on role and relationships';
COMMENT ON FUNCTION portal_has_building_access(UUID, UUID) IS 'Checks if user has access to specific building based on role and agency/leaseholder relationships';
