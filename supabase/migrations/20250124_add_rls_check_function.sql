-- Add helper function to check RLS status
-- This function helps verify that RLS is properly enabled on tables

CREATE OR REPLACE FUNCTION public.check_rls_enabled(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' 
        AND c.relname = table_name
        AND c.relrowsecurity = true
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_rls_enabled(text) TO authenticated;
