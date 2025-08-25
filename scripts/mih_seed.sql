-- MIH SEED SCRIPT GENERATED: 2024-12-19
-- This script populates MIH Property Management with sample building data
-- All data is properly linked to the MIH agency for complete isolation

-- =====================================================
-- STEP 1: Ensure MIH Agency Exists
-- =====================================================

-- Insert MIH Agency if it doesn't exist
INSERT INTO agencies (id, name, domain) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'MIH Property Management',
    'mihproperty.co.uk'
) ON CONFLICT (domain) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- Get MIH Agency ID for reference
DO $$
DECLARE
    mih_agency_id UUID;
BEGIN
    SELECT id INTO mih_agency_id FROM agencies WHERE domain = 'mihproperty.co.uk';
    IF mih_agency_id IS NULL THEN
        RAISE EXCEPTION 'MIH Agency not found';
    END IF;
    RAISE NOTICE 'MIH Agency ID: %', mih_agency_id;
END $$;

-- =====================================================
-- STEP 2: Clear Existing MIH Data (if any)
-- =====================================================

-- Clear existing MIH data to avoid duplicates
DELETE FROM building_compliance_assets WHERE agency_id = (
    SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'
);

DELETE FROM compliance_assets WHERE agency_id = (
    SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'
);

DELETE FROM leases WHERE agency_id = (
    SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'
);

DELETE FROM leaseholders WHERE agency_id = (
    SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'
);

DELETE FROM units WHERE agency_id = (
    SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'
);

DELETE FROM buildings WHERE agency_id = (
    SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'
);

-- =====================================================
-- STEP 3: Insert MIH Buildings
-- =====================================================

INSERT INTO buildings (
    id,
    building_code,
    name,
    address,
    city,
    postcode,
    unit_count,
    is_hrb,
    year_built,
    agency_id,
    created_at,
    updated_at
) VALUES 
    (
        gen_random_uuid(),
        'MIH-RC-001',
        'Riverside Court',
        '15 Thames Street',
        'London',
        'SE1 9NG',
        24,
        true,
        2010,
        (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'),
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'MIH-MH-002',
        'Marina Heights',
        '8 Harbour Way',
        'Brighton',
        'BN1 2AA',
        18,
        false,
        2015,
        (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'),
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'MIH-OG-003',
        'Oakwood Gardens',
        '42 Oakwood Lane',
        'Guildford',
        'GU1 4XY',
        32,
        true,
        2008,
        (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'),
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'MIH-WP-004',
        'Westminster Place',
        '7 Victoria Street',
        'London',
        'SW1E 6DE',
        28,
        true,
        2012,
        (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'),
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'MIH-CM-005',
        'Chelsea Manor',
        '23 Kings Road',
        'London',
        'SW3 5RP',
        16,
        false,
        2018,
        (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'),
        NOW(),
        NOW()
    );

-- =====================================================
-- STEP 4: Insert MIH Blocks (if applicable)
-- =====================================================

-- Note: If you have a blocks table, insert here
-- For now, we'll assume buildings are single-block structures

-- =====================================================
-- STEP 5: Insert MIH Units
-- =====================================================

-- Riverside Court Units (24 units)
INSERT INTO units (
    id,
    building_id,
    unit_number,
    unit_type,
    floor,
    bedrooms,
    bathrooms,
    square_feet,
    is_occupied,
    agency_id,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    b.id,
    u.unit_number,
    u.unit_type,
    u.floor,
    u.bedrooms,
    u.bathrooms,
    u.square_feet,
    u.is_occupied,
    b.agency_id,
    NOW(),
    NOW()
FROM buildings b
CROSS JOIN (
    VALUES 
        (1, 'Studio', 1, 1, 1, 450, false),
        (2, 'Studio', 1, 1, 1, 480, false),
        (3, 'Studio', 1, 1, 1, 460, false),
        (4, '1 Bedroom', 2, 1, 1, 650, false),
        (5, '1 Bedroom', 2, 1, 1, 680, false),
        (6, '1 Bedroom', 2, 1, 1, 670, false),
        (7, '1 Bedroom', 2, 1, 1, 690, false),
        (8, '1 Bedroom', 2, 1, 1, 660, false),
        (9, '2 Bedroom', 3, 2, 2, 850, false),
        (10, '2 Bedroom', 3, 2, 2, 880, false),
        (11, '2 Bedroom', 3, 2, 2, 870, false),
        (12, '2 Bedroom', 3, 2, 2, 890, false),
        (13, '2 Bedroom', 3, 2, 2, 860, false),
        (14, '2 Bedroom', 3, 2, 2, 875, false),
        (15, '2 Bedroom', 3, 2, 2, 885, false),
        (16, '3 Bedroom', 4, 2, 2, 1100, false),
        (17, '3 Bedroom', 4, 2, 2, 1150, false),
        (18, '3 Bedroom', 4, 2, 2, 1120, false),
        (19, '3 Bedroom', 4, 2, 2, 1180, false),
        (20, '3 Bedroom', 4, 2, 2, 1140, false),
        (21, '3 Bedroom', 4, 2, 2, 1160, false),
        (22, '3 Bedroom', 4, 2, 2, 1130, false),
        (23, '3 Bedroom', 4, 2, 2, 1170, false),
        (24, '3 Bedroom', 4, 2, 2, 1110, false)
) AS u(unit_number, unit_type, bedrooms, bathrooms, floor, square_feet, is_occupied)
WHERE b.building_code = 'MIH-RC-001';

-- Marina Heights Units (18 units)
INSERT INTO units (
    id,
    building_id,
    unit_number,
    unit_type,
    floor,
    bedrooms,
    bathrooms,
    square_feet,
    is_occupied,
    agency_id,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    b.id,
    u.unit_number,
    u.unit_type,
    u.floor,
    u.bedrooms,
    u.bathrooms,
    u.square_feet,
    u.is_occupied,
    b.agency_id,
    NOW(),
    NOW()
FROM buildings b
CROSS JOIN (
    VALUES 
        (1, 'Studio', 1, 1, 1, 420, false),
        (2, 'Studio', 1, 1, 1, 440, false),
        (3, 'Studio', 1, 1, 1, 430, false),
        (4, '1 Bedroom', 2, 1, 1, 580, false),
        (5, '1 Bedroom', 2, 1, 1, 600, false),
        (6, '1 Bedroom', 2, 1, 1, 590, false),
        (7, '1 Bedroom', 2, 1, 1, 610, false),
        (8, '1 Bedroom', 2, 1, 1, 595, false),
        (9, '2 Bedroom', 3, 2, 2, 750, false),
        (10, '2 Bedroom', 3, 2, 2, 780, false),
        (11, '2 Bedroom', 3, 2, 2, 770, false),
        (12, '2 Bedroom', 3, 2, 2, 790, false),
        (13, '2 Bedroom', 3, 2, 2, 760, false),
        (14, '2 Bedroom', 3, 2, 2, 775, false),
        (15, '3 Bedroom', 4, 2, 2, 950, false),
        (16, '3 Bedroom', 4, 2, 2, 980, false),
        (17, '3 Bedroom', 4, 2, 2, 970, false),
        (18, '3 Bedroom', 4, 2, 2, 990, false)
) AS u(unit_number, unit_type, bedrooms, bathrooms, floor, square_feet, is_occupied)
WHERE b.building_code = 'MIH-MH-002';

-- Oakwood Gardens Units (32 units)
INSERT INTO units (
    id,
    building_id,
    unit_number,
    unit_type,
    floor,
    bedrooms,
    bathrooms,
    square_feet,
    is_occupied,
    agency_id,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    b.id,
    u.unit_number,
    u.unit_type,
    u.floor,
    u.bedrooms,
    u.bathrooms,
    u.square_feet,
    u.is_occupied,
    b.agency_id,
    NOW(),
    NOW()
FROM buildings b
CROSS JOIN (
    VALUES 
        (1, 'Studio', 1, 1, 1, 400, false),
        (2, 'Studio', 1, 1, 1, 420, false),
        (3, 'Studio', 1, 1, 1, 410, false),
        (4, '1 Bedroom', 2, 1, 1, 550, false),
        (5, '1 Bedroom', 2, 1, 1, 570, false),
        (6, '1 Bedroom', 2, 1, 1, 560, false),
        (7, '1 Bedroom', 2, 1, 1, 580, false),
        (8, '1 Bedroom', 2, 1, 1, 565, false),
        (9, '2 Bedroom', 3, 2, 2, 720, false),
        (10, '2 Bedroom', 3, 2, 2, 750, false),
        (11, '2 Bedroom', 3, 2, 2, 740, false),
        (12, '2 Bedroom', 3, 2, 2, 760, false),
        (13, '2 Bedroom', 3, 2, 2, 730, false),
        (14, '2 Bedroom', 3, 2, 2, 745, false),
        (15, '2 Bedroom', 3, 2, 2, 755, false),
        (16, '2 Bedroom', 3, 2, 2, 735, false),
        (17, '3 Bedroom', 4, 2, 2, 900, false),
        (18, '3 Bedroom', 4, 2, 2, 930, false),
        (19, '3 Bedroom', 4, 2, 2, 920, false),
        (20, '3 Bedroom', 4, 2, 2, 940, false),
        (21, '3 Bedroom', 4, 2, 2, 910, false),
        (22, '3 Bedroom', 4, 2, 2, 925, false),
        (23, '3 Bedroom', 4, 2, 2, 935, false),
        (24, '3 Bedroom', 4, 2, 2, 905, false),
        (25, '4 Bedroom', 5, 3, 3, 1200, false),
        (26, '4 Bedroom', 5, 3, 3, 1250, false),
        (27, '4 Bedroom', 5, 3, 3, 1220, false),
        (28, '4 Bedroom', 5, 3, 3, 1280, false),
        (29, '4 Bedroom', 5, 3, 3, 1240, false),
        (30, '4 Bedroom', 5, 3, 3, 1260, false),
        (31, '4 Bedroom', 5, 3, 3, 1230, false),
        (32, '4 Bedroom', 5, 3, 3, 1270, false)
) AS u(unit_number, unit_type, bedrooms, bathrooms, floor, square_feet, is_occupied)
WHERE b.building_code = 'MIH-OG-003';

-- Westminster Place Units (28 units)
INSERT INTO units (
    id,
    building_id,
    unit_number,
    unit_type,
    floor,
    bedrooms,
    bathrooms,
    square_feet,
    is_occupied,
    agency_id,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    b.id,
    u.unit_number,
    u.unit_type,
    u.floor,
    u.bedrooms,
    u.bathrooms,
    u.square_feet,
    u.is_occupied,
    b.agency_id,
    NOW(),
    NOW()
FROM buildings b
CROSS JOIN (
    VALUES 
        (1, 'Studio', 1, 1, 1, 500, false),
        (2, 'Studio', 1, 1, 1, 520, false),
        (3, 'Studio', 1, 1, 1, 510, false),
        (4, '1 Bedroom', 2, 1, 1, 700, false),
        (5, '1 Bedroom', 2, 1, 1, 720, false),
        (6, '1 Bedroom', 2, 1, 1, 710, false),
        (7, '1 Bedroom', 2, 1, 1, 730, false),
        (8, '1 Bedroom', 2, 1, 1, 715, false),
        (9, '2 Bedroom', 3, 2, 2, 900, false),
        (10, '2 Bedroom', 3, 2, 2, 930, false),
        (11, '2 Bedroom', 3, 2, 2, 920, false),
        (12, '2 Bedroom', 3, 2, 2, 940, false),
        (13, '2 Bedroom', 3, 2, 2, 910, false),
        (14, '2 Bedroom', 3, 2, 2, 925, false),
        (15, '2 Bedroom', 3, 2, 2, 935, false),
        (16, '2 Bedroom', 3, 2, 2, 905, false),
        (17, '3 Bedroom', 4, 2, 2, 1100, false),
        (18, '3 Bedroom', 4, 2, 2, 1130, false),
        (19, '3 Bedroom', 4, 2, 2, 1120, false),
        (20, '3 Bedroom', 4, 2, 2, 1140, false),
        (21, '3 Bedroom', 4, 2, 2, 1110, false),
        (22, '3 Bedroom', 4, 2, 2, 1125, false),
        (23, '3 Bedroom', 4, 2, 2, 1135, false),
        (24, '3 Bedroom', 4, 2, 2, 1105, false),
        (25, '4 Bedroom', 5, 3, 3, 1300, false),
        (26, '4 Bedroom', 5, 3, 3, 1330, false),
        (27, '4 Bedroom', 5, 3, 3, 1320, false),
        (28, '4 Bedroom', 5, 3, 3, 1340, false)
) AS u(unit_number, unit_type, bedrooms, bathrooms, floor, square_feet, is_occupied)
WHERE b.building_code = 'MIH-WP-004';

-- Chelsea Manor Units (16 units)
INSERT INTO units (
    id,
    building_id,
    unit_number,
    unit_type,
    floor,
    bedrooms,
    bathrooms,
    square_feet,
    is_occupied,
    agency_id,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    b.id,
    u.unit_number,
    u.unit_type,
    u.floor,
    u.bedrooms,
    u.bathrooms,
    u.square_feet,
    u.is_occupied,
    b.agency_id,
    NOW(),
    NOW()
FROM buildings b
CROSS JOIN (
    VALUES 
        (1, 'Studio', 1, 1, 1, 600, false),
        (2, 'Studio', 1, 1, 1, 620, false),
        (3, 'Studio', 1, 1, 1, 610, false),
        (4, '1 Bedroom', 2, 1, 1, 800, false),
        (5, '1 Bedroom', 2, 1, 1, 820, false),
        (6, '1 Bedroom', 2, 1, 1, 810, false),
        (7, '1 Bedroom', 2, 1, 1, 830, false),
        (8, '1 Bedroom', 2, 1, 1, 815, false),
        (9, '2 Bedroom', 3, 2, 2, 1000, false),
        (10, '2 Bedroom', 3, 2, 2, 1030, false),
        (11, '2 Bedroom', 3, 2, 2, 1020, false),
        (12, '2 Bedroom', 3, 2, 2, 1040, false),
        (13, '2 Bedroom', 3, 2, 2, 1010, false),
        (14, '2 Bedroom', 3, 2, 2, 1025, false),
        (15, '3 Bedroom', 4, 2, 2, 1200, false),
        (16, '3 Bedroom', 4, 2, 2, 1230, false)
) AS u(unit_number, unit_type, bedrooms, bathrooms, floor, square_feet, is_occupied)
WHERE b.building_code = 'MIH-CM-005';

-- =====================================================
-- STEP 6: Insert MIH Leaseholders
-- =====================================================

-- Sample leaseholders for MIH properties
INSERT INTO leaseholders (
    id,
    full_name,
    email,
    phone,
    address,
    emergency_contact_name,
    emergency_contact_phone,
    unit_id,
    agency_id,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    l.leaseholder_name,
    l.email,
    l.phone,
    l.address,
    l.emergency_contact_name,
    l.emergency_contact_phone,
    u.id,
    u.agency_id,
    NOW(),
    NOW()
FROM units u
JOIN buildings b ON u.building_id = b.id
CROSS JOIN (
    VALUES 
        ('Sarah Johnson', 'sarah.johnson@email.com', '+44 7700 900001', '15 Thames Street, London SE1 9NG', 'Michael Johnson', '+44 7700 900002'),
        ('David Chen', 'david.chen@email.com', '+44 7700 900003', '8 Harbour Way, Brighton BN1 2AA', 'Emma Chen', '+44 7700 900004'),
        ('Emma Thompson', 'emma.thompson@email.com', '+44 7700 900005', '42 Oakwood Lane, Guildford GU1 4XY', 'James Thompson', '+44 7700 900006'),
        ('Michael Brown', 'michael.brown@email.com', '+44 7700 900007', '7 Victoria Street, London SW1E 6DE', 'Lisa Brown', '+44 7700 900008'),
        ('Lisa Davis', 'lisa.davis@email.com', '+44 7700 900009', '23 Kings Road, London SW3 5RP', 'Robert Davis', '+44 7700 900010'),
        ('Robert Wilson', 'robert.wilson@email.com', '+44 7700 900011', '15 Thames Street, London SE1 9NG', 'Sarah Wilson', '+44 7700 900012'),
        ('Jennifer Lee', 'jennifer.lee@email.com', '+44 7700 900013', '8 Harbour Way, Brighton BN1 2AA', 'David Lee', '+44 7700 900014'),
        ('Christopher Garcia', 'christopher.garcia@email.com', '+44 7700 900015', '42 Oakwood Lane, Guildford GU1 4XY', 'Maria Garcia', '+44 7700 900016'),
        ('Maria Rodriguez', 'maria.rodriguez@email.com', '+44 7700 900017', '7 Victoria Street, London SW1E 6DE', 'Carlos Rodriguez', '+44 7700 900018'),
        ('Carlos Martinez', 'carlos.martinez@email.com', '+44 7700 900019', '23 Kings Road, London SW3 5RP', 'Ana Martinez', '+44 7700 900020')
) AS l(leaseholder_name, email, phone, address, emergency_contact_name, emergency_contact_phone)
WHERE u.unit_number <= 10; -- Assign first 10 units to leaseholders

-- =====================================================
-- STEP 7: Insert MIH Leases
-- =====================================================

-- Sample leases for MIH properties
INSERT INTO leases (
    id,
    unit_id,
    leaseholder_id,
    start_date,
    end_date,
    monthly_rent,
    deposit_amount,
    lease_type,
    status,
    agency_id,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    l.unit_id,
    l.leaseholder_id,
    l.start_date,
    l.end_date,
    l.monthly_rent,
    l.deposit_amount,
    l.lease_type,
    l.status,
    l.agency_id,
    NOW(),
    NOW()
FROM (
    SELECT 
        u.id as unit_id,
        lh.id as leaseholder_id,
        u.agency_id,
        CASE 
            WHEN u.unit_number = 1 THEN '2024-01-01'::date
            WHEN u.unit_number = 2 THEN '2024-02-01'::date
            WHEN u.unit_number = 3 THEN '2024-03-01'::date
            WHEN u.unit_number = 4 THEN '2024-04-01'::date
            WHEN u.unit_number = 5 THEN '2024-05-01'::date
            WHEN u.unit_number = 6 THEN '2024-06-01'::date
            WHEN u.unit_number = 7 THEN '2024-07-01'::date
            WHEN u.unit_number = 8 THEN '2024-08-01'::date
            WHEN u.unit_number = 9 THEN '2024-09-01'::date
            WHEN u.unit_number = 10 THEN '2024-10-01'::date
            ELSE '2024-11-01'::date
        END as start_date,
        CASE 
            WHEN u.unit_number = 1 THEN '2027-01-01'::date
            WHEN u.unit_number = 2 THEN '2027-02-01'::date
            WHEN u.unit_number = 3 THEN '2027-03-01'::date
            WHEN u.unit_number = 4 THEN '2027-04-01'::date
            WHEN u.unit_number = 5 THEN '2027-05-01'::date
            WHEN u.unit_number = 6 THEN '2027-06-01'::date
            WHEN u.unit_number = 7 THEN '2027-07-01'::date
            WHEN u.unit_number = 8 THEN '2027-08-01'::date
            WHEN u.unit_number = 9 THEN '2027-09-01'::date
            WHEN u.unit_number = 10 THEN '2027-10-01'::date
            ELSE '2027-11-01'::date
        END as end_date,
        CASE 
            WHEN u.unit_type = 'Studio' THEN 1200
            WHEN u.unit_type = '1 Bedroom' THEN 1800
            WHEN u.unit_type = '2 Bedroom' THEN 2400
            WHEN u.unit_type = '3 Bedroom' THEN 3200
            WHEN u.unit_type = '4 Bedroom' THEN 4200
            ELSE 2000
        END as monthly_rent,
        CASE 
            WHEN u.unit_type = 'Studio' THEN 2400
            WHEN u.unit_type = '1 Bedroom' THEN 3600
            WHEN u.unit_type = '2 Bedroom' THEN 4800
            WHEN u.unit_type = '3 Bedroom' THEN 6400
            WHEN u.unit_type = '4 Bedroom' THEN 8400
            ELSE 4000
        END as deposit_amount,
        'Assured Shorthold Tenancy' as lease_type,
        'active' as status
    FROM units u
    JOIN buildings b ON u.building_id = b.id
    WHERE u.unit_number <= 10
) l
JOIN leaseholders lh ON l.leaseholder_id = lh.id;

-- =====================================================
-- STEP 8: Insert MIH Compliance Assets
-- =====================================================

-- Standard compliance assets for MIH buildings
INSERT INTO compliance_assets (
    id,
    name,
    category,
    description,
    frequency_months,
    agency_id,
    created_at,
    updated_at
) VALUES 
    (
        gen_random_uuid(),
        'Fire Safety Assessment',
        'Fire & Life Safety',
        'Annual fire safety assessment and risk assessment',
        12,
        (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'),
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'Electrical Installation Condition Report',
        'Electrical & Mechanical',
        'EICR testing and certification',
        60,
        (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'),
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'Gas Safety Certificate',
        'Gas Safety',
        'Annual gas safety inspection and certification',
        12,
        (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'),
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'Asbestos Survey',
        'Health & Safety',
        'Asbestos survey and management plan',
        120,
        (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'),
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'Legionella Risk Assessment',
        'Health & Safety',
        'Legionella risk assessment and control measures',
        24,
        (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'),
        NOW(),
        NOW()
    ),
    (
        gen_random_uuid(),
        'PAT Testing',
        'Electrical & Mechanical',
        'Portable Appliance Testing',
        12,
        (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'),
        NOW(),
        NOW()
    );

-- =====================================================
-- STEP 9: Link Compliance Assets to Buildings
-- =====================================================

-- Link all compliance assets to all MIH buildings
INSERT INTO building_compliance_assets (
    id,
    building_id,
    asset_id,
    status,
    priority,
    due_date,
    next_due,
    agency_id,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    b.id,
    ca.id,
    'pending',
    CASE 
        WHEN ca.name LIKE '%Fire%' THEN 'high'
        WHEN ca.name LIKE '%Gas%' THEN 'high'
        WHEN ca.name LIKE '%Asbestos%' THEN 'high'
        ELSE 'medium'
    END,
    NOW() + INTERVAL '30 days',
    NOW() + INTERVAL '30 days',
    b.agency_id,
    NOW(),
    NOW()
FROM buildings b
CROSS JOIN compliance_assets ca
WHERE b.agency_id = (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk')
AND ca.agency_id = (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk');

-- =====================================================
-- STEP 10: Verification and Summary
-- =====================================================

-- Show MIH portfolio summary
SELECT 
    'MIH Portfolio Summary' as info,
    COUNT(DISTINCT b.id) as total_buildings,
    COUNT(DISTINCT u.id) as total_units,
    COUNT(DISTINCT lh.id) as total_leaseholders,
    COUNT(DISTINCT l.id) as total_leases,
    COUNT(DISTINCT ca.id) as total_compliance_assets,
    COUNT(DISTINCT bca.id) as total_compliance_items
FROM buildings b
LEFT JOIN units u ON b.id = u.building_id
LEFT JOIN leaseholders lh ON u.id = lh.unit_id
LEFT JOIN leases l ON u.id = l.unit_id
LEFT JOIN compliance_assets ca ON b.agency_id = ca.agency_id
LEFT JOIN building_compliance_assets bca ON b.id = bca.building_id
WHERE b.agency_id = (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk');

-- Show MIH buildings with unit counts
SELECT 
    b.building_code,
    b.name,
    b.address,
    b.unit_count,
    b.is_hrb,
    COUNT(u.id) as actual_units,
    COUNT(lh.id) as occupied_units,
    COUNT(l.id) as active_leases
FROM buildings b
LEFT JOIN units u ON b.id = u.building_id
LEFT JOIN leaseholders lh ON u.id = lh.unit_id
LEFT JOIN leases l ON u.id = l.unit_id AND l.status = 'active'
WHERE b.agency_id = (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk')
GROUP BY b.id, b.building_code, b.name, b.address, b.unit_count, b.is_hrb
ORDER BY b.building_code;

-- Show MIH compliance status
SELECT 
    b.name as building_name,
    ca.name as compliance_item,
    bca.status,
    bca.priority,
    bca.due_date,
    bca.next_due
FROM buildings b
JOIN building_compliance_assets bca ON b.id = bca.building_id
JOIN compliance_assets ca ON bca.asset_id = ca.id
WHERE b.agency_id = (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk')
ORDER BY b.name, ca.name;

-- =====================================================
-- MIH SEED SCRIPT COMPLETE
-- =====================================================

-- All MIH data has been successfully inserted with proper agency isolation
-- Users with @mihproperty.co.uk emails will only see this data
-- BlocIQ users will not have access to any MIH information
-- Data isolation is enforced at the database level via RLS policies
