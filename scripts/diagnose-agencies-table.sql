-- 🔍 Diagnose Agencies Table Structure

-- Step 1: Check what columns actually exist in agencies table
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'agencies'
ORDER BY ordinal_position;

-- Step 2: Check if our BlocIQ agency exists
SELECT 
  id,
  name,
  created_at
FROM agencies 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Step 3: Test the exact query that should work now
SELECT 
  am.agency_id,
  am.role,
  a.id as agency_id_check,
  a.name as agency_name
FROM agency_members am
JOIN agencies a ON am.agency_id = a.id
WHERE am.user_id = '938498a6-2906-4a75-bc91-5d0d586b227e';

-- Step 4: Check if the user exists and is properly linked
SELECT 
  'User exists in auth.users:' as check_type,
  id,
  email,
  created_at
FROM auth.users 
WHERE id = '938498a6-2906-4a75-bc91-5d0d586b227e'

UNION ALL

SELECT 
  'User linked in agency_members:' as check_type,
  user_id as id,
  role as email,
  created_at
FROM agency_members 
WHERE user_id = '938498a6-2906-4a75-bc91-5d0d586b227e';

-- Step 5: Show all foreign key relationships
SELECT
  'Foreign key constraints:' as info,
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
  AND tc.table_name IN ('agency_members');
