-- Fix Ashwood House compliance data
-- This script populates the correct tables that the compliance views expect

-- First, ensure we have the compliance assets in the right table
INSERT INTO compliance_assets (id, name, category, description, frequency_months) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Fire Safety Certificate', 'Fire Safety', 'Annual fire safety inspection and certificate', 12),
('550e8400-e29b-41d4-a716-446655440002', 'Gas Safety Certificate', 'Gas Safety', 'Annual gas safety inspection and certificate', 12),
('550e8400-e29b-41d4-a716-446655440003', 'Electrical Safety Certificate', 'Electrical', '5-year electrical safety inspection', 60),
('550e8400-e29b-41d4-a716-446655440004', 'Lift Maintenance Certificate', 'Lifts', 'Annual lift maintenance and inspection', 12),
('550e8400-e29b-41d4-a716-446655440005', 'Asbestos Survey', 'Health & Safety', '5-year asbestos survey', 60),
('550e8400-e29b-41d4-a716-446655440006', 'Energy Performance Certificate', 'Energy', '10-year EPC assessment', 120),
('550e8400-e29b-41d4-a716-446655440007', 'Building Insurance Certificate', 'Insurance', 'Annual building insurance renewal', 12),
('550e8400-e29b-41d4-a716-446655440008', 'PAT Testing', 'Electrical', 'Annual portable appliance testing', 12),
('550e8400-e29b-41d4-a716-446655440009', 'Water Hygiene Certificate', 'Water Safety', 'Annual water hygiene assessment', 12),
('550e8400-e29b-41d4-a716-446655440010', 'Fire Risk Assessment', 'Fire Safety', 'Annual fire risk assessment', 12)
ON CONFLICT (id) DO NOTHING;

-- Get Ashwood House building ID
DO $$
DECLARE
    ashwood_building_id UUID;
BEGIN
    SELECT id INTO ashwood_building_id FROM buildings WHERE name = 'Ashwood House' LIMIT 1;
    
    IF ashwood_building_id IS NULL THEN
        RAISE NOTICE 'Ashwood House not found in buildings table';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found Ashwood House with ID: %', ashwood_building_id;
    
    -- Insert building compliance assets for Ashwood House
    INSERT INTO building_compliance_assets (
        building_id, 
        compliance_asset_id, 
        status, 
        next_due_date, 
        last_renewed_date,
        notes,
        created_at,
        updated_at
    ) VALUES
        (ashwood_building_id, '550e8400-e29b-41d4-a716-446655440001', 'overdue', '2024-01-15', '2023-01-15', 'Fire safety certificate expired - OVERDUE'),
        (ashwood_building_id, '550e8400-e29b-41d4-a716-446655440002', 'due_soon', '2024-02-15', '2023-02-15', 'Gas safety inspection due next month'),
        (ashwood_building_id, '550e8400-e29b-41d4-a716-446655440003', 'compliant', '2027-06-01', '2022-06-01', 'Electrical safety certificate valid until 2027'),
        (ashwood_building_id, '550e8400-e29b-41d4-a716-446655440004', 'due_soon', '2024-03-01', '2023-03-01', 'Lift maintenance due in March'),
        (ashwood_building_id, '550e8400-e29b-41d4-a716-446655440005', 'compliant', '2026-03-01', '2021-03-01', 'Asbestos survey completed in 2021'),
        (ashwood_building_id, '550e8400-e29b-41d4-a716-446655440006', 'compliant', '2030-01-01', '2020-01-01', 'EPC valid until 2030'),
        (ashwood_building_id, '550e8400-e29b-41d4-a716-446655440007', 'compliant', '2025-01-01', '2024-01-01', 'Building insurance renewed'),
        (ashwood_building_id, '550e8400-e29b-41d4-a716-446655440008', 'due_soon', '2024-04-01', '2023-04-01', 'PAT testing due in April'),
        (ashwood_building_id, '550e8400-e29b-41d4-a716-446655440009', 'compliant', '2024-08-01', '2023-08-01', 'Water hygiene assessment completed'),
        (ashwood_building_id, '550e8400-e29b-41d4-a716-446655440010', 'compliant', '2024-12-15', '2023-12-15', 'Fire risk assessment completed')
    ON CONFLICT (building_id, compliance_asset_id) 
    DO UPDATE SET 
        status = EXCLUDED.status,
        next_due_date = EXCLUDED.next_due_date,
        last_renewed_date = EXCLUDED.last_renewed_date,
        notes = EXCLUDED.notes,
        updated_at = NOW();
    
    RAISE NOTICE 'Successfully inserted/updated compliance assets for Ashwood House';
END $$;

-- Verify the data was inserted correctly
SELECT 
    b.name as building_name,
    ca.name as asset_name,
    ca.category,
    bca.status,
    bca.next_due_date,
    bca.last_renewed_date,
    bca.notes
FROM building_compliance_assets bca
JOIN buildings b ON b.id = bca.building_id
JOIN compliance_assets ca ON ca.id = bca.compliance_asset_id
WHERE b.name = 'Ashwood House'
ORDER BY ca.category, ca.name;
