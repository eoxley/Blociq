-- Fix missing building columns
-- Run this script to add the missing columns that are causing the error

-- Add building information fields
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS access_notes TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS sites_staff TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS parking_info TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS council_borough VARCHAR(255);

-- Add building management fields
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_manager_name VARCHAR(255);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_manager_email VARCHAR(255);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_manager_phone VARCHAR(50);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);

-- Add building characteristics
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_age VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS construction_type VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS total_floors VARCHAR(10);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS lift_available VARCHAR(10);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS heating_type VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS hot_water_type VARCHAR(100);

-- Add operational information
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS waste_collection_day VARCHAR(20);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS recycling_info TEXT;

-- Add insurance and compliance fields
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_insurance_provider VARCHAR(255);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_insurance_expiry DATE;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS fire_safety_status VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS asbestos_status VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS energy_rating VARCHAR(10);

-- Add financial fields
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS service_charge_frequency VARCHAR(50);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS ground_rent_amount DECIMAL(10,2);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS ground_rent_frequency VARCHAR(50);

-- Add HRB flag
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS is_hrb BOOLEAN DEFAULT false;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'buildings' 
AND column_name IN ('total_floors', 'is_hrb', 'construction_type', 'lift_available', 'heating_type', 'hot_water_type', 'fire_safety_status', 'asbestos_status', 'energy_rating')
ORDER BY column_name; 