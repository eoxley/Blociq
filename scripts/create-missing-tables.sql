-- 🚨 Create Missing Tables for BlocIQ
-- Run this in Supabase SQL Editor

-- Step 1: Create agencies table
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create agency_members table
CREATE TABLE IF NOT EXISTS agency_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, user_id)
);

-- Step 3: Create user_connections table (for future Outlook token management)
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

-- Step 4: Add foreign key constraints
DO $$
BEGIN
  -- Add foreign key from agency_members to agencies
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'agency_members_agency_id_fkey'
      AND table_name = 'agency_members'
  ) THEN
    ALTER TABLE agency_members 
    ADD CONSTRAINT agency_members_agency_id_fkey 
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added agency_members -> agencies foreign key';
  END IF;

  -- Add foreign key from agency_members to auth.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'agency_members_user_id_fkey'
      AND table_name = 'agency_members'
  ) THEN
    ALTER TABLE agency_members 
    ADD CONSTRAINT agency_members_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added agency_members -> auth.users foreign key';
  END IF;

  -- Add foreign key from user_connections to auth.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_connections_user_id_fkey'
      AND table_name = 'user_connections'
  ) THEN
    ALTER TABLE user_connections 
    ADD CONSTRAINT user_connections_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added user_connections -> auth.users foreign key';
  END IF;
END $$;

-- Step 5: Insert BlocIQ agency
INSERT INTO agencies (id, name, slug, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001', 
  'BlocIQ',
  'blociq',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  updated_at = NOW();

-- Step 6: Verify your user exists in auth.users
DO $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE id = '938498a6-2906-4a75-bc91-5d0d586b227e'
  ) INTO user_exists;
  
  IF user_exists THEN
    RAISE NOTICE 'User 938498a6-2906-4a75-bc91-5d0d586b227e exists in auth.users';
  ELSE
    RAISE NOTICE 'WARNING: User 938498a6-2906-4a75-bc91-5d0d586b227e NOT found in auth.users';
  END IF;
END $$;

-- Step 7: Link your user to BlocIQ agency
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

-- Step 8: Enable Row Level Security (RLS)
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies
-- Agency members can view their own memberships
DROP POLICY IF EXISTS "Users can view their own agency memberships" ON agency_members;
CREATE POLICY "Users can view their own agency memberships" ON agency_members
  FOR SELECT USING (user_id = auth.uid());

-- Users can view agencies they belong to
DROP POLICY IF EXISTS "Users can view their agencies" ON agencies;
CREATE POLICY "Users can view their agencies" ON agencies
  FOR SELECT USING (
    id IN (
      SELECT agency_id FROM agency_members WHERE user_id = auth.uid()
    )
  );

-- Users can manage their own connections
DROP POLICY IF EXISTS "Users can manage their own connections" ON user_connections;
CREATE POLICY "Users can manage their own connections" ON user_connections
  FOR ALL USING (user_id = auth.uid());

-- Step 10: Verification queries
SELECT 
  'SUCCESS: Tables created' as status,
  COUNT(*) as agency_count
FROM agencies;

SELECT 
  'SUCCESS: Agency membership created' as status,
  am.id as membership_id,
  am.role,
  a.name as agency_name,
  a.slug as agency_slug,
  u.email as user_email
FROM agency_members am
JOIN agencies a ON am.agency_id = a.id
JOIN auth.users u ON am.user_id = u.id
WHERE am.user_id = '938498a6-2906-4a75-bc91-5d0d586b227e';

-- Step 11: Check foreign key constraints
SELECT 
  'Foreign key constraints created:' as status,
  constraint_name,
  table_name
FROM information_schema.table_constraints 
WHERE table_name IN ('agency_members', 'user_connections') 
  AND constraint_type = 'FOREIGN KEY'
ORDER BY table_name, constraint_name;
