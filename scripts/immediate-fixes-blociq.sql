-- 🚨 Immediate Fixes for BlocIQ

-- Step 1: Fix Supabase Schema (Run in SQL Editor)

-- Fix the foreign key relationship that's causing the 400 error
-- First, check if the agencies table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'agencies'
);

-- If agencies table doesn't exist or has wrong structure, create it:
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agency_members table with proper foreign keys
CREATE TABLE IF NOT EXISTS agency_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, user_id)
);

-- Add foreign key constraints safely
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
  ELSE
    RAISE NOTICE 'Foreign key agency_members -> agencies already exists';
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
  ELSE
    RAISE NOTICE 'Foreign key agency_members -> auth.users already exists';
  END IF;
END $$;

-- Step 2: Insert BlocIQ agency data
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

-- Step 3: Verify your user exists in auth.users
SELECT 
  id, 
  email, 
  created_at,
  'User exists in auth.users' as status
FROM auth.users 
WHERE id = '938498a6-2906-4a75-bc91-5d0d586b227e';

-- Step 4: Link your user to BlocIQ agency
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

-- Step 5: Enable Row Level Security (RLS)
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
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

-- Step 7: Verification - Test the relationship
SELECT 
  'SUCCESS: Agency membership working' as status,
  am.id as membership_id,
  am.role,
  a.name as agency_name,
  a.slug as agency_slug,
  u.email as user_email
FROM agency_members am
JOIN agencies a ON am.agency_id = a.id
JOIN auth.users u ON am.user_id = u.id
WHERE am.user_id = '938498a6-2906-4a75-bc91-5d0d586b227e';

-- Step 8: Check outlook_tokens table status
SELECT 
  'Outlook tokens status' as info,
  COUNT(*) as token_count,
  MAX(expires_at) as latest_expiry
FROM outlook_tokens 
WHERE user_id = '938498a6-2906-4a75-bc91-5d0d586b227e';

-- Final verification query - this should return your agency without errors
SELECT 
  a.id,
  a.name,
  a.slug,
  'Ready for dashboard API' as status
FROM agencies a
WHERE a.id IN (
  SELECT agency_id 
  FROM agency_members 
  WHERE user_id = '938498a6-2906-4a75-bc91-5d0d586b227e'
);
