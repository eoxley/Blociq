// Debug script to check user agency linkage issue
// User ID from logs: 938498a6-2906-4a75-bc91-5d0d586b227e

console.log('🔍 Debugging User Agency Linkage Issue...\n');

const userId = '938498a6-2906-4a75-bc91-5d0d586b227e';

console.log('User ID from logs:', userId);
console.log('\nQueries to run in Supabase dashboard:\n');

console.log('1. Check user profile:');
console.log(`SELECT id, first_name, last_name, email, agency_id, created_at FROM profiles WHERE id = '${userId}';`);

console.log('\n2. Check agency memberships:');
console.log(`SELECT * FROM agency_members WHERE user_id = '${userId}';`);

console.log('\n3. Check available agencies:');
console.log(`SELECT id, name, slug, created_at FROM agencies ORDER BY created_at ASC;`);

console.log('\n4. Check user building access:');
console.log(`SELECT * FROM user_building_access WHERE user_id = '${userId}';`);

console.log('\n5. Check auth.users table:');
console.log(`SELECT id, email, created_at FROM auth.users WHERE id = '${userId}';`);

console.log('\n🔧 Potential fixes:');
console.log('\nIf no agencies exist:');
console.log(`INSERT INTO agencies (name, slug) VALUES ('Default Agency', 'default-agency');`);

console.log('\nIf agency exists but user not linked:');
console.log(`
-- Get first agency ID
WITH first_agency AS (SELECT id FROM agencies LIMIT 1)
-- Update user profile
UPDATE profiles
SET agency_id = (SELECT id FROM first_agency)
WHERE id = '${userId}';

-- Create agency membership if needed
INSERT INTO agency_members (user_id, agency_id, role, invitation_status, joined_at)
SELECT '${userId}', id, 'admin', 'accepted', NOW()
FROM agencies
LIMIT 1
ON CONFLICT (user_id, agency_id) DO NOTHING;
`);

console.log('\nIf profile missing:');
console.log(`
INSERT INTO profiles (id, email, agency_id)
SELECT au.id, au.email, a.id
FROM auth.users au
CROSS JOIN (SELECT id FROM agencies LIMIT 1) a
WHERE au.id = '${userId}'
ON CONFLICT (id) DO UPDATE SET agency_id = EXCLUDED.agency_id;
`);

console.log('\n✅ After running fixes, the user should be able to use Ask BlocIQ again.');