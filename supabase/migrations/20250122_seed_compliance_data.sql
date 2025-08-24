-- Seed Basic Compliance Data
-- This migration creates sample compliance assets and links them to buildings
-- Run this after fixing RLS issues to ensure compliance pages have data to display

BEGIN;

-- Insert basic compliance assets if they don't exist
INSERT INTO compliance_assets (id, title, category, description, frequency_months, frequency)
VALUES
  (gen_random_uuid(), 'EICR', 'Electrical Safety', 'Electrical Installation Condition Report - required every 5 years for residential properties', 60, '5 years'),
  (gen_random_uuid(), 'Gas Safety Certificate', 'Gas Safety', 'Annual gas safety inspection and certificate for gas appliances', 12, 'Annual'),
  (gen_random_uuid(), 'Fire Risk Assessment', 'Fire Safety', 'Fire risk assessment review - required annually', 12, 'Annual'),
  (gen_random_uuid(), 'PAT Testing', 'Electrical Safety', 'Portable Appliance Testing for electrical equipment', 12, 'Annual'),
  (gen_random_uuid(), 'Legionella Risk Assessment', 'Water Safety', 'Legionella risk assessment for water systems', 24, '2 years'),
  (gen_random_uuid(), 'Asbestos Survey', 'Building Safety', 'Asbestos survey and management plan', 60, '5 years'),
  (gen_random_uuid(), 'Lift Inspection', 'Building Safety', 'Lift safety inspection and testing', 6, '6 months'),
  (gen_random_uuid(), 'Emergency Lighting', 'Fire Safety', 'Emergency lighting system testing', 6, '6 months')
ON CONFLICT (title) DO NOTHING;

-- Log what was inserted
DO $$
DECLARE
  asset_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO asset_count FROM compliance_assets;
  RAISE NOTICE 'Compliance assets table now contains % records', asset_count;
END $$;

-- Create a sample compliance setup for the problematic building if it exists
-- This ensures the building has some compliance data to display
DO $$
DECLARE
  building_exists BOOLEAN;
  asset_id UUID;
  building_id UUID := '2beeec1d-a94e-4058-b881-213d74cc6830';
BEGIN
  -- Check if building exists
  SELECT EXISTS(SELECT 1 FROM buildings WHERE id = building_id) INTO building_exists;
  
  IF building_exists THEN
    RAISE NOTICE 'Building % exists, creating sample compliance setup', building_id;
    
    -- Get a sample compliance asset
    SELECT id INTO asset_id FROM compliance_assets LIMIT 1;
    
    IF asset_id IS NOT NULL THEN
      -- Insert sample compliance setup
      INSERT INTO building_compliance_assets (
        id, 
        building_id, 
        compliance_asset_id, 
        status, 
        next_due_date,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        building_id,
        asset_id,
        'pending',
        (CURRENT_DATE + INTERVAL '90 days')::date,
        NOW(),
        NOW()
      )
      ON CONFLICT (building_id, compliance_asset_id) DO NOTHING;
      
      RAISE NOTICE 'Sample compliance setup created for building %', building_id;
    ELSE
      RAISE NOTICE 'No compliance assets available to link to building';
    END IF;
  ELSE
    RAISE NOTICE 'Building % does not exist, skipping sample setup', building_id;
  END IF;
END $$;

COMMIT;
