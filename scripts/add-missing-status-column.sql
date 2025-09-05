-- Fix the missing 'status' column in agencies table

-- Step 1: Add the missing status column to agencies table
ALTER TABLE agencies 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Step 2: Update existing agencies to have active status
UPDATE agencies 
SET status = 'active' 
WHERE status IS NULL;

-- Step 3: Verify the column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'agencies' 
ORDER BY ordinal_position;

-- Step 4: Insert/update your BlocIQ agency with proper status
INSERT INTO agencies (id, name, status, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001', 
  'BlocIQ',
  'active',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Step 5: Ensure user is properly linked
INSERT INTO agency_members (agency_id, user_id, role, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',1Pu
  'owner',
  NOW()
)
ON CONFLICT (agency_id, user_id) DO UPDATE SET
  role = 'owner',
  updated_at = NOW();

-- Step 6: Test the query that's failing in your frontend
-- This should match what your frontend is trying to do
SELECT 
  a.id,
  a.name,
  a.status,  -- This column was missing!
  am.role,
  am.user_id
FROM agencies a
JOIN agency_members am ON a.id = am.agency_id
WHERE am.user_id = '938498a6-2906-4a75-bc91-5d0d586b227e';

-- Step 7: If you need other common columns, add them too
ALTER TABLE agencies 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS website VARCHAR(255),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 8: Create a trigger to auto-update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_agencies_updated_at ON agencies;
CREATE TRIGGER update_agencies_updated_at
    BEFORE UPDATE ON agencies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Final verification - this should return 1 row with status = 'active'
SELECT 
  a.id,
  a.name,
  a.status,
  am.role,
  COUNT(*) as member_count
FROM agencies a
JOIN agency_members am ON a.id = am.agency_id
WHERE am.user_id = '938498a6-2906-4a75-bc91-5d0d586b227e'
GROUP BY a.id, a.name, a.status, am.role;
