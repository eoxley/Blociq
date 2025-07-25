-- Create foundational tables with UUID primary keys
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Buildings table - Core property information
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  unit_count INTEGER,
  access_notes TEXT,
  sites_staff TEXT,
  parking_info TEXT,
  council_borough VARCHAR(255),
  building_manager_name VARCHAR(255),
  building_manager_email VARCHAR(255),
  building_manager_phone VARCHAR(50),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  building_age VARCHAR(100),
  construction_type VARCHAR(100),
  total_floors VARCHAR(10),
  lift_available VARCHAR(10),
  heating_type VARCHAR(100),
  hot_water_type VARCHAR(100),
  waste_collection_day VARCHAR(20),
  recycling_info TEXT,
  building_insurance_provider VARCHAR(255),
  building_insurance_expiry DATE,
  fire_safety_status VARCHAR(100),
  asbestos_status VARCHAR(100),
  energy_rating VARCHAR(10),
  service_charge_frequency VARCHAR(50),
  ground_rent_amount DECIMAL(10,2),
  ground_rent_frequency VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Units within buildings
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  unit_number VARCHAR(50) NOT NULL,
  type VARCHAR(50),
  floor VARCHAR(20),
  leaseholder_email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaseholders information
CREATE TABLE IF NOT EXISTS leaseholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add leaseholder_id to units table
ALTER TABLE units ADD COLUMN IF NOT EXISTS leaseholder_id UUID REFERENCES leaseholders(id);

-- Compliance assets table
CREATE TABLE IF NOT EXISTS compliance_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  frequency_months INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Building compliance assets table
CREATE TABLE IF NOT EXISTS building_compliance_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  compliance_asset_id UUID NOT NULL REFERENCES compliance_assets(id) ON DELETE CASCADE,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  assigned_to VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(building_id, compliance_asset_id)
);

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_buildings_name ON buildings(name);
CREATE INDEX IF NOT EXISTS idx_units_building_id ON units(building_id);
CREATE INDEX IF NOT EXISTS idx_leaseholders_unit_id ON leaseholders(unit_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_category ON compliance_assets(category);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_building_id ON building_compliance_assets(building_id);

-- Enable RLS on all tables
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaseholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_compliance_assets ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Allow all operations for authenticated users" ON buildings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON units FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON leaseholders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON compliance_assets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON building_compliance_assets FOR ALL USING (auth.role() = 'authenticated'); 