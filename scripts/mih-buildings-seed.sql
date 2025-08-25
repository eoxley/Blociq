-- =====================================================
-- MIH Buildings Seed Script
-- Add 3 real MIH buildings to the system
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

    -- 1. MIH Building 1: Riverside Court
    INSERT INTO buildings (
        id,
        name,
        address,
        building_code,
        unit_count,
        is_hrb,
        agency_id,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        'Riverside Court',
        '15 Thames Street, London SE1 9NG',
        'MIH-RC-001',
        24,
        true,
        mih_agency_id,
        NOW(),
        NOW()
    );

    -- 2. MIH Building 2: Marina Heights
    INSERT INTO buildings (
        id,
        name,
        address,
        building_code,
        unit_count,
        is_hrb,
        agency_id,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        'Marina Heights',
        '8 Harbour Way, Brighton BN1 2AA',
        'MIH-MH-002',
        18,
        false,
        mih_agency_id,
        NOW(),
        NOW()
    );

    -- 3. MIH Building 3: Oakwood Gardens
    INSERT INTO buildings (
        id,
        name,
        address,
        building_code,
        unit_count,
        is_hrb,
        agency_id,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        'Oakwood Gardens',
        '42 Oakwood Lane, Guildford GU1 4XY',
        'MIH-OG-003',
        32,
        true,
        mih_agency_id,
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Successfully added 3 MIH buildings';
END $$;

-- Verify the buildings were added
SELECT 
    b.name,
    b.address,
    b.building_code,
    b.unit_count,
    b.is_hrb,
    a.name as agency_name,
    b.created_at
FROM buildings b
JOIN agencies a ON b.agency_id = a.id
WHERE a.domain = 'mihproperty.co.uk'
ORDER BY b.name;

-- Add some sample units for each building
DO $$
DECLARE
    building_record RECORD;
    unit_count INTEGER;
    unit_number INTEGER;
BEGIN
    FOR building_record IN 
        SELECT id, unit_count, name FROM buildings 
        WHERE agency_id = (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk')
    LOOP
        -- Add units for each building
        FOR unit_number IN 1..building_record.unit_count LOOP
            INSERT INTO units (
                id,
                building_id,
                unit_number,
                unit_type,
                floor,
                agency_id,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                building_record.id,
                unit_number,
                CASE 
                    WHEN unit_number <= 3 THEN 'Studio'
                    WHEN unit_number <= 8 THEN '1 Bedroom'
                    WHEN unit_number <= 15 THEN '2 Bedroom'
                    ELSE '3 Bedroom'
                END,
                (unit_number - 1) / 4 + 1, -- Simple floor calculation
                building_record.agency_id,
                NOW(),
                NOW()
            );
        END LOOP;
        
        RAISE NOTICE 'Added % units for %', building_record.unit_count, building_record.name;
    END LOOP;
END $$;

-- Add some sample compliance assets for MIH buildings
DO $$
DECLARE
    building_record RECORD;
    mih_agency_id UUID;
BEGIN
    -- Get MIH agency ID
    SELECT id INTO mih_agency_id FROM agencies WHERE domain = 'mihproperty.co.uk';
    
    FOR building_record IN 
        SELECT id, name FROM buildings 
        WHERE agency_id = mih_agency_id
    LOOP
        -- Add Fire Safety Assessment
        INSERT INTO compliance_assets (
            id,
            name,
            category,
            description,
            frequency_months,
            agency_id,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'Fire Safety Assessment',
            'Fire & Life Safety',
            'Annual fire safety assessment and risk assessment',
            12,
            mih_agency_id,
            NOW(),
            NOW()
        );
        
        -- Add Electrical Installation Condition Report
        INSERT INTO compliance_assets (
            id,
            name,
            category,
            description,
            frequency_months,
            agency_id,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'Electrical Installation Condition Report',
            'Electrical & Mechanical',
            'EICR testing and certification',
            60,
            mih_agency_id,
            NOW(),
            NOW()
        );
        
        -- Add Gas Safety Certificate
        INSERT INTO compliance_assets (
            id,
            name,
            category,
            description,
            frequency_months,
            agency_id,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'Gas Safety Certificate',
            'Gas Safety',
            'Annual gas safety inspection and certification',
            12,
            mih_agency_id,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Added compliance assets for %', building_record.name;
    END LOOP;
END $$;

-- Link compliance assets to buildings
DO $$
DECLARE
    building_record RECORD;
    asset_record RECORD;
    mih_agency_id UUID;
BEGIN
    -- Get MIH agency ID
    SELECT id INTO mih_agency_id FROM agencies WHERE domain = 'mihproperty.co.uk';
    
    FOR building_record IN 
        SELECT id, name FROM buildings 
        WHERE agency_id = mih_agency_id
    LOOP
        FOR asset_record IN 
            SELECT id, name FROM compliance_assets 
            WHERE agency_id = mih_agency_id
        LOOP
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
            ) VALUES (
                gen_random_uuid(),
                building_record.id,
                asset_record.id,
                'pending',
                CASE 
                    WHEN asset_record.name LIKE '%Fire%' THEN 'high'
                    WHEN asset_record.name LIKE '%Gas%' THEN 'high'
                    ELSE 'medium'
                END,
                NOW() + INTERVAL '30 days',
                NOW() + INTERVAL '30 days',
                mih_agency_id,
                NOW(),
                NOW()
            );
        END LOOP;
        
        RAISE NOTICE 'Linked compliance assets to %', building_record.name;
    END LOOP;
END $$;

-- Final verification
SELECT 
    'MIH Buildings Setup Complete' as status,
    (SELECT COUNT(*) FROM buildings WHERE agency_id = (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'))) as total_buildings,
    (SELECT COUNT(*) FROM units WHERE agency_id = (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'))) as total_units,
    (SELECT COUNT(*) FROM compliance_assets WHERE agency_id = (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk'))) as total_compliance_assets;

-- Show MIH portfolio summary
SELECT 
    b.name as building_name,
    b.address,
    b.unit_count,
    b.is_hrb,
    COUNT(u.id) as actual_units,
    COUNT(bca.id) as compliance_items
FROM buildings b
LEFT JOIN units u ON b.id = u.building_id
LEFT JOIN building_compliance_assets bca ON b.id = bca.building_id
WHERE b.agency_id = (SELECT id FROM agencies WHERE domain = 'mihproperty.co.uk')
GROUP BY b.id, b.name, b.address, b.unit_count, b.is_hrb
ORDER BY b.name;
