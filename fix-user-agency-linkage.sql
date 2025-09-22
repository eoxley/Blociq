-- Fix user agency linkage for BlocIQ
-- This script ensures all users are properly linked to the BlocIQ agency

-- 1. Ensure BlocIQ agency exists
INSERT INTO agencies (name, slug, created_at, updated_at)
VALUES ('BlocIQ', 'blociq', NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- 2. Get the BlocIQ agency ID for reference
DO $$
DECLARE
    blociq_agency_id UUID;
    user_record RECORD;
BEGIN
    -- Get BlocIQ agency ID
    SELECT id INTO blociq_agency_id FROM agencies WHERE slug = 'blociq';

    IF blociq_agency_id IS NULL THEN
        RAISE EXCEPTION 'BlocIQ agency not found';
    END IF;

    RAISE NOTICE 'BlocIQ Agency ID: %', blociq_agency_id;

    -- 3. Fix all users without agency linkage
    FOR user_record IN
        SELECT au.id, au.email, p.agency_id
        FROM auth.users au
        LEFT JOIN profiles p ON au.id = p.id
        WHERE p.agency_id IS NULL OR p.agency_id != blociq_agency_id
    LOOP
        RAISE NOTICE 'Fixing user: % (%)', user_record.email, user_record.id;

        -- Update or insert profile with BlocIQ agency
        INSERT INTO profiles (id, email, agency_id, created_at, updated_at)
        VALUES (user_record.id, user_record.email, blociq_agency_id, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          agency_id = blociq_agency_id,
          updated_at = NOW();

        -- Create agency membership
        INSERT INTO agency_members (user_id, agency_id, role, invitation_status, joined_at, created_at, updated_at)
        VALUES (user_record.id, blociq_agency_id, 'admin', 'accepted', NOW(), NOW(), NOW())
        ON CONFLICT (user_id, agency_id) DO UPDATE SET
          invitation_status = 'accepted',
          joined_at = COALESCE(agency_members.joined_at, NOW()),
          updated_at = NOW();
    END LOOP;

    -- 4. Ensure eleanor.oxley@blociq.co.uk has proper access
    INSERT INTO profiles (id, email, agency_id, first_name, last_name, created_at, updated_at)
    SELECT au.id, au.email, blociq_agency_id, 'Eleanor', 'Oxley', NOW(), NOW()
    FROM auth.users au
    WHERE au.email = 'eleanor.oxley@blociq.co.uk'
    ON CONFLICT (id) DO UPDATE SET
      agency_id = blociq_agency_id,
      first_name = COALESCE(profiles.first_name, 'Eleanor'),
      last_name = COALESCE(profiles.last_name, 'Oxley'),
      updated_at = NOW();

    -- 5. Ensure eleanor has admin access to BlocIQ agency
    INSERT INTO agency_members (user_id, agency_id, role, invitation_status, joined_at, created_at, updated_at)
    SELECT au.id, blociq_agency_id, 'admin', 'accepted', NOW(), NOW(), NOW()
    FROM auth.users au
    WHERE au.email = 'eleanor.oxley@blociq.co.uk'
    ON CONFLICT (user_id, agency_id) DO UPDATE SET
      role = 'admin',
      invitation_status = 'accepted',
      updated_at = NOW();

END $$;

-- 6. Verify the fixes
SELECT 'User Profile Check' as check_type,
       au.email,
       p.agency_id,
       a.name as agency_name,
       p.first_name,
       p.last_name
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN agencies a ON p.agency_id = a.id
ORDER BY au.email;

SELECT 'Agency Membership Check' as check_type,
       au.email,
       am.role,
       am.invitation_status,
       a.name as agency_name
FROM auth.users au
LEFT JOIN agency_members am ON au.id = am.user_id
LEFT JOIN agencies a ON am.agency_id = a.id
ORDER BY au.email;

-- 7. Show summary
SELECT
    'Summary' as info,
    COUNT(*) as total_users,
    COUNT(CASE WHEN p.agency_id IS NOT NULL THEN 1 END) as users_with_agency,
    COUNT(CASE WHEN am.invitation_status = 'accepted' THEN 1 END) as users_with_membership
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN agency_members am ON au.id = am.user_id AND am.invitation_status = 'accepted';