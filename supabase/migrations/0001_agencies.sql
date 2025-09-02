-- ========================================
-- MULTI-AGENCY SETUP: AGENCIES & MEMBERSHIP
-- Migration: 0001_agencies.sql
-- Description: Create agencies table and membership system
-- ========================================

-- Enhance existing agencies table with required fields
ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS domain text,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Ensure agencies table has all required constraints
ALTER TABLE public.agencies 
ADD CONSTRAINT IF NOT EXISTS agencies_slug_unique UNIQUE (slug);

-- Update existing agencies to have slugs if they don't
UPDATE public.agencies 
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Make slug not null after backfill
ALTER TABLE public.agencies 
ALTER COLUMN slug SET NOT NULL;

-- Create agency role enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agency_role') THEN
    CREATE TYPE public.agency_role AS ENUM ('owner','admin','manager','viewer');
  END IF;
END$$;

-- Create agency_members table for membership management
CREATE TABLE IF NOT EXISTS public.agency_members (
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.agency_role NOT NULL DEFAULT 'manager',
  invitation_status text NOT NULL DEFAULT 'accepted',
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agency_id, user_id)
);

-- Create helper function to check agency membership
CREATE OR REPLACE FUNCTION public.is_member_of_agency(target_agency uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members m
    WHERE m.agency_id = target_agency
      AND m.user_id = auth.uid()
      AND m.invitation_status = 'accepted'
  );
$$;

-- Create helper function to get user's agency role
CREATE OR REPLACE FUNCTION public.get_user_agency_role(target_agency uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT m.role::text
  FROM public.agency_members m
  WHERE m.agency_id = target_agency
    AND m.user_id = auth.uid()
    AND m.invitation_status = 'accepted';
$$;

-- Create helper function to check if user has manager+ permissions
CREATE OR REPLACE FUNCTION public.is_agency_manager_or_above(target_agency uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members m
    WHERE m.agency_id = target_agency
      AND m.user_id = auth.uid()
      AND m.invitation_status = 'accepted'
      AND m.role IN ('owner', 'admin', 'manager')
  );
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_agency_members_user_id ON public.agency_members(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_members_agency_id ON public.agency_members(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_members_role ON public.agency_members(role);
CREATE INDEX IF NOT EXISTS idx_agencies_slug ON public.agencies(slug);
CREATE INDEX IF NOT EXISTS idx_agencies_status ON public.agencies(status);

-- Add updated_at trigger for agency_members
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agency_members_updated_at 
  BEFORE UPDATE ON public.agency_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.agencies IS 'Property management agencies/companies';
COMMENT ON TABLE public.agency_members IS 'Agency membership with role-based access control';
COMMENT ON FUNCTION public.is_member_of_agency(uuid) IS 'Check if current user is member of specified agency';
COMMENT ON FUNCTION public.get_user_agency_role(uuid) IS 'Get current user''s role in specified agency';
COMMENT ON FUNCTION public.is_agency_manager_or_above(uuid) IS 'Check if current user has manager+ permissions in agency';
