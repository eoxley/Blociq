-- Fix Supabase Foreign Key Relationships and Data Setup

-- Step 1: Check current schema structure
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('agencies', 'agency_members', 'user_connections')
ORDER BY table_name, ordinal_position;

-- Step 2: Check existing foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('agency_members', 'user_connections');

-- Step 3: Create tables if they don't exist with proper structure
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider VARCHAR(50) NOT NULL, -- 'outlook', 'google', etc
  outlook_refresh_token TEXT,
  outlook_access_token TEXT,
  outlook_token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Step 4: Add foreign key constraints if missing
-- (This will fail gracefully if constraints already exist)
DO $$
BEGIN
  -- Add foreign key from agency_members to agencies
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'agency_members_agency_id_fkey'
  ) THEN
    ALTER TABLE agency_members 
    ADD CONSTRAINT agency_members_agency_id_fkey 
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key from agency_members to auth.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'agency_members_user_id_fkey'
  ) THEN
    ALTER TABLE agency_members 
    ADD CONSTRAINT agency_members_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key from user_connections to auth.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_connections_user_id_fkey'
  ) THEN
    ALTER TABLE user_connections 
    ADD CONSTRAINT user_connections_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 5: Insert your agency and user data
INSERT INTO agencies (id, name, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001', 
  'BlocIQ',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Step 6: Link your user to the agency
-- First, verify your user exists in auth.users
SELECT id, email FROM auth.users WHERE id = '938498a6-2906-4a75-bc91-5d0d586b227e';

-- Then insert the agency membership
INSERT INTO agency_members (agency_id, user_id, role, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '938498a6-2906-4a75-bc91-5d0d586b227e',
  'owner',
  NOW()
)
ON CONFLICT (agency_id, user_id) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();

-- Step 7: Verification queries
-- Check if agency_members relationship is working
SELECT 
  am.id,
  am.agency_id,
  am.user_id,
  am.role,
  a.name as agency_name,
  u.email as user_email
FROM agency_members am
JOIN agencies a ON am.agency_id = a.id
JOIN auth.users u ON am.user_id = u.id
WHERE am.user_id = '938498a6-2906-4a75-bc91-5d0d586b227e';

-- Check user_connections table
SELECT 
  provider,
  connected_at,
  outlook_refresh_token IS NOT NULL as has_refresh_token,
  outlook_token_expires_at
FROM user_connections 
WHERE user_id = '938498a6-2906-4a75-bc91-5d0d586b227e';

-- Step 8: Enable Row Level Security (RLS) policies if needed
-- This might be why you're getting permission errors

-- Agency members policy
DROP POLICY IF EXISTS "Users can view their own agency memberships" ON agency_members;
CREATE POLICY "Users can view their own agency memberships" ON agency_members
FOR SELECT USING (user_id = auth.uid());

-- Agencies policy  
DROP POLICY IF EXISTS "Users can view their agencies" ON agencies;
CREATE POLICY "Users can view their agencies" ON agencies
FOR SELECT USING (
  id IN (
    SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
  )
);

-- User connections policy
DROP POLICY IF EXISTS "Users can manage their own connections" ON user_connections;
CREATE POLICY "Users can manage their own connections" ON user_connections
FOR ALL USING (user_id = auth.uid());
