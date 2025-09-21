-- Fix Demo Users Agency Assignment
-- Ensures demo and test users have proper agency_id assignments

-- First, check if we have agencies in the database
DO $$
DECLARE
    default_agency_id UUID;
    demo_user_count INTEGER;
BEGIN
    -- Get the first agency ID as default
    SELECT id INTO default_agency_id FROM agencies LIMIT 1;

    IF default_agency_id IS NULL THEN
        RAISE NOTICE 'No agencies found. Creating default agency...';

        -- Create a default agency if none exists
        INSERT INTO agencies (id, name, description, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'BlocIQ Demo Agency',
            'Default agency for demo and test users',
            NOW(),
            NOW()
        )
        RETURNING id INTO default_agency_id;

        RAISE NOTICE 'Created default agency with ID: %', default_agency_id;
    ELSE
        RAISE NOTICE 'Using existing agency ID: %', default_agency_id;
    END IF;

    -- Update profiles table to assign agency_id to users without one
    UPDATE profiles
    SET agency_id = default_agency_id, updated_at = NOW()
    WHERE agency_id IS NULL;

    GET DIAGNOSTICS demo_user_count = ROW_COUNT;
    RAISE NOTICE 'Updated % users with missing agency_id', demo_user_count;

    -- Specifically ensure these demo accounts have the agency assigned
    INSERT INTO profiles (id, email, agency_id, created_at, updated_at)
    VALUES
        -- Add common test email addresses (will be ignored if they don't exist in auth.users)
        (
            (SELECT id FROM auth.users WHERE email = 'testbloc@blociq.co.uk' LIMIT 1),
            'testbloc@blociq.co.uk',
            default_agency_id,
            NOW(),
            NOW()
        ),
        (
            (SELECT id FROM auth.users WHERE email = 'eleanor.oxley@blociq.co.uk' LIMIT 1),
            'eleanor.oxley@blociq.co.uk',
            default_agency_id,
            NOW(),
            NOW()
        ),
        (
            (SELECT id FROM auth.users WHERE email = 'demo@blociq.co.uk' LIMIT 1),
            'demo@blociq.co.uk',
            default_agency_id,
            NOW(),
            NOW()
        )
    ON CONFLICT (id) DO UPDATE
    SET
        agency_id = EXCLUDED.agency_id,
        updated_at = NOW()
    WHERE profiles.agency_id IS NULL;

    -- Report current status
    SELECT COUNT(*) AS total_profiles FROM profiles;
    SELECT COUNT(*) AS profiles_with_agency FROM profiles WHERE agency_id IS NOT NULL;
    SELECT COUNT(*) AS profiles_without_agency FROM profiles WHERE agency_id IS NULL;

    RAISE NOTICE 'Demo user agency assignment completed!';

END $$;

-- Verification query
SELECT
    p.email,
    p.agency_id,
    a.name as agency_name,
    CASE
        WHEN p.agency_id IS NULL THEN '❌ Missing Agency'
        ELSE '✅ Has Agency'
    END as status
FROM profiles p
LEFT JOIN agencies a ON p.agency_id = a.id
ORDER BY p.email;