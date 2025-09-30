-- Add super_admin role support to profiles table
-- This migration ensures the role column exists and adds super_admin as a valid role

-- Ensure profiles table has role column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(50);

-- Create role enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM (
      'super_admin',
      'admin', 
      'manager',
      'staff',
      'leaseholder',
      'director'
    );
  END IF;
END$$;

-- Update role column to use the enum (if not already)
-- Note: We'll keep it as VARCHAR for now to avoid breaking existing data

-- Add check constraint for valid roles
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('super_admin', 'admin', 'manager', 'staff', 'leaseholder', 'director'));

-- Create index on role for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Update RLS policies to allow super_admin access to onboarding tables
-- (These will be created by the onboarding module migration, but let's ensure they exist)

-- Enable RLS on onboarding tables if they exist
DO $$
BEGIN
  -- Check if onboarding_raw table exists and enable RLS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_raw') THEN
    ALTER TABLE onboarding_raw ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Check if staging_structured table exists and enable RLS  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staging_structured') THEN
    ALTER TABLE staging_structured ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Check if onboarding_batches table exists and enable RLS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_batches') THEN
    ALTER TABLE onboarding_batches ENABLE ROW LEVEL SECURITY;
  END IF;
END$$;

-- Create super_admin access function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  );
$$;

-- Create policies for super_admin access to onboarding tables
-- (Only if tables exist)

-- onboarding_raw policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_raw') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Super admins can manage onboarding_raw" ON public.onboarding_raw;
    
    -- Create super admin policy
    CREATE POLICY "Super admins can manage onboarding_raw" ON public.onboarding_raw
      FOR ALL USING (public.is_super_admin());
  END IF;
END$$;

-- staging_structured policies  
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staging_structured') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Super admins can manage staging_structured" ON public.staging_structured;
    
    -- Create super admin policy
    CREATE POLICY "Super admins can manage staging_structured" ON public.staging_structured
      FOR ALL USING (public.is_super_admin());
  END IF;
END$$;

-- onboarding_batches policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_batches') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Super admins can manage onboarding_batches" ON public.onboarding_batches;
    
    -- Create super admin policy
    CREATE POLICY "Super admins can manage onboarding_batches" ON public.onboarding_batches
      FOR ALL USING (public.is_super_admin());
  END IF;
END$$;

-- Add audit_log table if it doesn't exist (for onboarding audit trails)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_id UUID,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'success',
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create policy for super_admin access to audit_log
CREATE POLICY "Super admins can view audit_log" ON public.audit_log
  FOR SELECT USING (public.is_super_admin());

-- Create index for audit_log performance
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
