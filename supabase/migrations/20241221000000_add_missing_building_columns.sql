-- Add missing building columns that are referenced in the application
-- This migration adds columns that are defined in database_migrations.sql but may not be applied

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

-- Add comments for documentation
COMMENT ON COLUMN buildings.total_floors IS 'Total number of floors in the building';
COMMENT ON COLUMN buildings.is_hrb IS 'Flag indicating if this building is classified as a High-Risk Building (HRB)';
COMMENT ON COLUMN buildings.construction_type IS 'Type of construction (e.g., Concrete, Steel, Timber)';
COMMENT ON COLUMN buildings.lift_available IS 'Whether the building has a lift (Yes/No)';
COMMENT ON COLUMN buildings.heating_type IS 'Type of heating system (e.g., Central, Individual, District)';
COMMENT ON COLUMN buildings.hot_water_type IS 'Type of hot water system (e.g., Central, Individual, Electric)';
COMMENT ON COLUMN buildings.fire_safety_status IS 'Current fire safety compliance status';
COMMENT ON COLUMN buildings.asbestos_status IS 'Current asbestos management status';
COMMENT ON COLUMN buildings.energy_rating IS 'Energy Performance Certificate rating'; 