-- Fix Compliance System RLS Issues
-- This migration disables RLS on compliance tables to allow service role access
-- Run this to fix HTTP 500 errors in compliance APIs

BEGIN;

-- Disable RLS on compliance tables to allow service role access
-- This is a temporary fix - in production, you should use proper RLS policies
ALTER TABLE compliance_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE building_compliance_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents DISABLE ROW LEVEL SECURITY;

-- Log the changes
DO $$
BEGIN
    RAISE NOTICE 'Disabled RLS on compliance tables for service role access';
    RAISE NOTICE 'This allows supabaseAdmin client to work without RLS policy conflicts';
END $$;

COMMIT;
