-- =====================================================
-- MIH User Setup Script
-- Creates Ellie as the main MIH user
-- =====================================================

-- Get MIH Agency ID
DO $$
DECLARE
    mih_agency_id UUID;
BEGIN
    -- Get MIH agency ID
    SELECT id INTO mih_agency_id FROM agencies WHERE domain = 'mihproperty.co.uk';
    
    IF mih_agency_id IS NULL THEN
        RAISE EXCEPTION 'MIH Agency not found. Please run setup-mih-agency.sql first.';
    END IF;

    -- Create Ellie's user profile
    INSERT INTO users (
        id,
        email,
        full_name,
        role,
        agency_id,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(), -- This will be replaced by the actual auth.users ID
        'ellie@mihproperty.co.uk',
        'Ellie MIH',
        'mih_manager',
        mih_agency_id,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        agency_id = EXCLUDED.agency_id,
        updated_at = NOW();

    RAISE NOTICE 'Ellie MIH user profile created/updated';
END $$;

-- Verify Ellie's user profile
SELECT 
    u.email,
    u.full_name,
    u.role,
    a.name as agency_name,
    a.domain as agency_domain,
    u.created_at
FROM users u
JOIN agencies a ON u.agency_id = a.id
WHERE u.email = 'ellie@mihproperty.co.uk';

-- Show MIH agency summary
SELECT 
    'MIH Agency Summary' as info,
    a.name as agency_name,
    a.domain as agency_domain,
    COUNT(u.id) as total_users,
    COUNT(b.id) as total_buildings,
    COUNT(ca.id) as total_compliance_assets
FROM agencies a
LEFT JOIN users u ON a.id = u.agency_id
LEFT JOIN buildings b ON a.id = b.agency_id
LEFT JOIN compliance_assets ca ON a.id = ca.agency_id
WHERE a.domain = 'mihproperty.co.uk'
GROUP BY a.id, a.name, a.domain;

-- Show all MIH users
SELECT 
    u.email,
    u.full_name,
    u.role,
    u.created_at,
    CASE 
        WHEN u.agency_id IS NOT NULL THEN 'Linked'
        ELSE 'Not Linked'
    END as agency_status
FROM users u
WHERE u.email LIKE '%@mihproperty.co.uk'
ORDER BY u.created_at;

-- Show MIH buildings and their status
SELECT 
    b.name as building_name,
    b.address,
    b.unit_count,
    b.is_hrb,
    COUNT(u.id) as actual_units,
    COUNT(bca.id) as compliance_items,
    b.created_at
FROM buildings b
LEFT JOIN units u ON b.id = u.building_id
LEFT JOIN building_compliance_assets bca ON b.id = bca.building_id
WHERE b.agency_id = (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk')
GROUP BY b.id, b.name, b.address, b.unit_count, b.is_hrb, b.created_at
ORDER BY b.name;
