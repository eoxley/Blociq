-- Add test emails to the database
-- This script adds sample emails that will be visible in the inbox

-- First, let's check if there are any users
SELECT 'Checking for users...' as info;
SELECT COUNT(*) as user_count FROM auth.users;

-- Get the first user ID
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user from auth.users
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    
    IF first_user_id IS NULL THEN
        RAISE NOTICE 'No users found. Creating a test user...';
        
        -- Create a test user
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'test@blociq.com',
            crypt('testpassword123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW()
        );
        
        -- Get the newly created user ID
        SELECT id INTO first_user_id FROM auth.users WHERE email = 'test@blociq.com';
        RAISE NOTICE 'Created test user with ID: %', first_user_id;
    ELSE
        RAISE NOTICE 'Using existing user with ID: %', first_user_id;
    END IF;
    
    -- Insert test emails
    INSERT INTO incoming_emails (
        id,
        subject,
        from_email,
        from_name,
        body_preview,
        received_at,
        is_read,
        is_handled,
        user_id,
        building_id,
        created_at,
        updated_at
    ) VALUES
    (
        gen_random_uuid(),
        'Heating Issue in Flat 1',
        'john.smith@email.com',
        'John Smith',
        'The heating system is not working properly in my flat. Can someone please check it?',
        NOW() - INTERVAL '2 days',
        false,
        false,
        first_user_id,
        '2beeec1d-a94e-4058-b881-213d74cc6830',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'Noise Complaint',
        'sarah.johnson@email.com',
        'Sarah Johnson',
        'There is excessive noise coming from the flat above. Can this be addressed?',
        NOW() - INTERVAL '3 days',
        false,
        false,
        first_user_id,
        '2beeec1d-a94e-4058-b881-213d74cc6830',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'Maintenance Request',
        'michael.brown@email.com',
        'Michael Brown',
        'The kitchen tap is leaking. Please send a plumber.',
        NOW() - INTERVAL '4 days',
        true,
        true,
        first_user_id,
        '2beeec1d-a94e-4058-b881-213d74cc6830',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'Parking Space Request',
        'emma.davis@email.com',
        'Emma Davis',
        'I would like to request a parking space for my vehicle.',
        NOW() - INTERVAL '5 days',
        false,
        false,
        first_user_id,
        '2beeec1d-a94e-4058-b881-213d74cc6830',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'Internet Connection Issue',
        'david.wilson@email.com',
        'David Wilson',
        'The internet connection in my flat is very slow. Can this be investigated?',
        NOW() - INTERVAL '6 days',
        true,
        false,
        first_user_id,
        '2beeec1d-a94e-4058-b881-213d74cc6830',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'Window Repair Needed',
        'lisa.anderson@email.com',
        'Lisa Anderson',
        'The window in my bedroom is not closing properly. Please arrange for repair.',
        NOW() - INTERVAL '7 days',
        false,
        false,
        first_user_id,
        '2beeec1d-a94e-4058-b881-213d74cc6830',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'Electricity Problem',
        'robert.taylor@email.com',
        'Robert Taylor',
        'There is an electrical issue in my flat. The lights keep flickering.',
        NOW() - INTERVAL '8 days',
        true,
        true,
        first_user_id,
        '2beeec1d-a94e-4058-b881-213d74cc6830',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'Cleaning Service Request',
        'jennifer.martinez@email.com',
        'Jennifer Martinez',
        'I would like to request a cleaning service for my flat.',
        NOW() - INTERVAL '9 days',
        false,
        false,
        first_user_id,
        '2beeec1d-a94e-4058-b881-213d74cc6830',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'Package Delivery Issue',
        'christopher.lee@email.com',
        'Christopher Lee',
        'I have a package that was delivered but I was not home. Can you help?',
        NOW() - INTERVAL '10 days',
        true,
        false,
        first_user_id,
        '2beeec1d-a94e-4058-b881-213d74cc6830',
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'Security Concern',
        'amanda.garcia@email.com',
        'Amanda Garcia',
        'I noticed a security issue with the main entrance. Can this be addressed?',
        NOW() - INTERVAL '11 days',
        false,
        false,
        first_user_id,
        '2beeec1d-a94e-4058-b881-213d74cc6830',
        NOW(),
        NOW()
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Inserted test emails for user: %', first_user_id;
END $$;

-- Verify the emails were inserted
SELECT 'Verification:' as info;
SELECT COUNT(*) as total_emails FROM incoming_emails;
SELECT COUNT(*) as emails_with_user_id FROM incoming_emails WHERE user_id IS NOT NULL;
SELECT COUNT(*) as emails_without_user_id FROM incoming_emails WHERE user_id IS NULL;

-- Show sample emails
SELECT 'Sample emails:' as info;
SELECT 
    subject,
    from_email,
    is_read,
    is_handled,
    received_at
FROM incoming_emails 
WHERE user_id IS NOT NULL 
ORDER BY received_at DESC 
LIMIT 5; 