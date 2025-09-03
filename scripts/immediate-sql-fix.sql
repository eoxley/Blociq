-- 🚨 Immediate Fixes for BlocIQ - SQL Script

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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure agency_members has correct foreign key relationship
ALTER TABLE agency_members 
DROP CONSTRAINT IF EXISTS agency_members_agency_id_fkey;

ALTER TABLE agency_members 
ADD CONSTRAINT agency_members_agency_id_fkey 
FOREIGN KEY (agency_id) REFERENCES agencies(id);

-- Now insert your data
INSERT INTO agencies (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'BlocIQ')
ON CONFLICT (id) DO NOTHING;

INSERT INTO agency_members (agency_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001', '938498a6-2906-4a75-bc91-5d0d586b227e', 'owner')
ON CONFLICT (agency_id, user_id) DO UPDATE SET role = 'owner';

-- Verify it worked
SELECT am.*, a.name 
FROM agency_members am 
JOIN agencies a ON am.agency_id = a.id 
WHERE am.user_id = '938498a6-2906-4a75-bc91-5d0d586b227e';

-- Quick verification queries
-- Should return 1 row with your agency
SELECT 'Agency membership check:' as status, * FROM agency_members WHERE user_id = '938498a6-2906-4a75-bc91-5d0d586b227e';

-- Should show the foreign key relationship exists
SELECT 'Foreign key constraints:' as status, constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'agency_members' AND constraint_type = 'FOREIGN KEY';
