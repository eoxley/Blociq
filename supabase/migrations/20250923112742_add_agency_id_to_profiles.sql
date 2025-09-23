-- Add agency_id column to profiles table and set up relationships
-- This fixes the missing column that was causing RLS policy failures

-- Add the agency_id column with foreign key constraint
ALTER TABLE profiles
ADD COLUMN agency_id UUID REFERENCES agencies(id);

-- Update existing profiles to link to BlocIQ agency
-- First, get the BlocIQ agency ID and update profiles
UPDATE profiles
SET agency_id = (
  SELECT id FROM agencies
  WHERE slug = 'blociq-property-management'
  LIMIT 1
)
WHERE agency_id IS NULL;

-- Add index for performance on agency_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_agency_id ON profiles(agency_id);

-- Update RLS policies to properly use the agency_id column
-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create new RLS policies that use agency_id for proper access control
CREATE POLICY "Users can view profiles in their agency" ON profiles
FOR SELECT USING (
  agency_id = (
    SELECT agency_id FROM users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE USING (
  id = auth.uid()
);

CREATE POLICY "Users can insert their own profile" ON profiles
FOR INSERT WITH CHECK (
  id = auth.uid()
);