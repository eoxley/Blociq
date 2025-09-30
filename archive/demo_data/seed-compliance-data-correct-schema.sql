-- Seed Compliance Data with Correct Schema
-- This script creates sample compliance assets and building assignments using the correct column names

BEGIN;

-- Insert compliance assets using the correct schema (name, category, description)
INSERT INTO compliance_assets (id, name, category, description, created_at) VALUES
  (gen_random_uuid(), 'EICR', 'Electrical', 'Electrical Installation Condition Report - required every 5 years for residential properties', NOW()),
  (gen_random_uuid(), 'Gas Safety Certificate', 'Gas', 'Annual gas safety inspection and certificate for gas appliances', NOW()),
  (gen_random_uuid(), 'Fire Risk Assessment', 'Fire Safety', 'Fire risk assessment review - required annually', NOW()),
  (gen_random_uuid(), 'PAT Testing', 'Electrical', 'Portable Appliance Testing for electrical equipment', NOW()),
  (gen_random_uuid(), 'Legionella Risk Assessment', 'Water Safety', 'Legionella risk assessment for water systems', NOW()),
  (gen_random_uuid(), 'Asbestos Survey', 'Building Safety', 'Asbestos survey and management plan', NOW()),
  (gen_random_uuid(), 'Lift Inspection', 'Building Safety', 'Lift safety inspection and testing', NOW()),
  (gen_random_uuid(), 'Emergency Lighting', 'Fire Safety', 'Emergency lighting system testing', NOW()),
  (gen_random_uuid(), 'H&S Log', 'Health & Safety', 'Health and Safety log book maintenance', NOW()),
  (gen_random_uuid(), 'Building Insurance', 'Insurance', 'Building insurance certificate and policy documents', NOW())
ON CONFLICT (name) DO NOTHING;

-- Log what was inserted
DO $$
DECLARE
  asset_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO asset_count FROM compliance_assets;
  RAISE NOTICE 'Compliance assets table now contains % records', asset_count;
END $$;

-- Create sample compliance setups for existing buildings
DO $$
DECLARE
  building_record RECORD;
  asset_record RECORD;
  building_count INTEGER := 0;
  asset_count INTEGER := 0;
BEGIN
  -- Get all buildings
  FOR building_record IN SELECT id, name FROM buildings LIMIT 5 LOOP
    building_count := building_count + 1;
    RAISE NOTICE 'Processing building: % (ID: %)', building_record.name, building_record.id;
    
    -- Get a few compliance assets to assign
    FOR asset_record IN SELECT id, name FROM compliance_assets LIMIT 3 LOOP
      asset_count := asset_count + 1;
      
      -- Insert building compliance asset assignment
      INSERT INTO building_compliance_assets (
        id, 
        building_id, 
        asset_id, 
        status, 
        next_due_date,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        building_record.id,
        asset_record.id,
        CASE 
          WHEN asset_count % 3 = 0 THEN 'compliant'
          WHEN asset_count % 3 = 1 THEN 'overdue'
          ELSE 'pending'
        END,
        (CURRENT_DATE + INTERVAL (30 + (asset_count * 10))::text || ' days')::date,
        'Sample compliance asset for ' || building_record.name,
        NOW(),
        NOW()
      )
      ON CONFLICT (building_id, asset_id) DO NOTHING;
      
      RAISE NOTICE 'Assigned asset % to building %', asset_record.name, building_record.name;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Processed % buildings and created % asset assignments', building_count, asset_count;
END $$;

-- Verify the data
DO $$
DECLARE
  total_assets INTEGER;
  total_assignments INTEGER;
  buildings_with_assets INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_assets FROM compliance_assets;
  SELECT COUNT(*) INTO total_assignments FROM building_compliance_assets;
  SELECT COUNT(DISTINCT building_id) INTO buildings_with_assets FROM building_compliance_assets;
  
  RAISE NOTICE 'Final counts:';
  RAISE NOTICE '  Total compliance assets: %', total_assets;
  RAISE NOTICE '  Total building assignments: %', total_assignments;
  RAISE NOTICE '  Buildings with compliance assets: %', buildings_with_assets;
END $$;

COMMIT;
