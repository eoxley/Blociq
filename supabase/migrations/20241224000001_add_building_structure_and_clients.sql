-- Migration: Add building structure, clients, and RMC directors
-- Date: 2024-12-24

-- 1. Add structure and status fields to buildings
ALTER TABLE buildings
ADD COLUMN IF NOT EXISTS structure_type TEXT; -- values: 'Freehold', 'RMC', 'Tripartite'

ALTER TABLE buildings
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Standard'; -- values: 'Standard', 'Onboarding', etc.

-- Add comments for documentation
COMMENT ON COLUMN buildings.structure_type IS 'Building structure type: Freehold, RMC, or Tripartite';
COMMENT ON COLUMN buildings.status IS 'Building status: Standard, Onboarding, etc.';

-- 2. Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_building_id ON clients(building_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

-- Add comments
COMMENT ON TABLE clients IS 'Client information for buildings';
COMMENT ON COLUMN clients.building_id IS 'Reference to the building this client is associated with';
COMMENT ON COLUMN clients.name IS 'Client name';
COMMENT ON COLUMN clients.email IS 'Client email address';
COMMENT ON COLUMN clients.phone IS 'Client phone number';
COMMENT ON COLUMN clients.address IS 'Client address';

-- 3. Create rmc_directors table (linked to leaseholders)
CREATE TABLE IF NOT EXISTS rmc_directors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaseholder_id UUID REFERENCES leaseholders(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  position TEXT, -- e.g., 'Chairman', 'Secretary', 'Treasurer'
  appointed_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique combination of leaseholder and building
  UNIQUE(leaseholder_id, building_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rmc_directors_leaseholder_id ON rmc_directors(leaseholder_id);
CREATE INDEX IF NOT EXISTS idx_rmc_directors_building_id ON rmc_directors(building_id);
CREATE INDEX IF NOT EXISTS idx_rmc_directors_position ON rmc_directors(position);

-- Add comments
COMMENT ON TABLE rmc_directors IS 'RMC directors linked to leaseholders and buildings';
COMMENT ON COLUMN rmc_directors.leaseholder_id IS 'Reference to the leaseholder who is a director';
COMMENT ON COLUMN rmc_directors.building_id IS 'Reference to the building where they are a director';
COMMENT ON COLUMN rmc_directors.position IS 'Director position (Chairman, Secretary, Treasurer, etc.)';
COMMENT ON COLUMN rmc_directors.appointed_date IS 'Date when they were appointed as director';
COMMENT ON COLUMN rmc_directors.notes IS 'Additional notes about the director';

-- 4. Enable Row Level Security (RLS) on new tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE rmc_directors ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for clients table
CREATE POLICY "Users can view clients for their buildings" ON clients
    FOR SELECT USING (
        building_id IN (
            SELECT id FROM buildings WHERE id = clients.building_id
        )
    );

CREATE POLICY "Users can insert clients for their buildings" ON clients
    FOR INSERT WITH CHECK (
        building_id IN (
            SELECT id FROM buildings WHERE id = clients.building_id
        )
    );

CREATE POLICY "Users can update clients for their buildings" ON clients
    FOR UPDATE USING (
        building_id IN (
            SELECT id FROM buildings WHERE id = clients.building_id
        )
    );

CREATE POLICY "Users can delete clients for their buildings" ON clients
    FOR DELETE USING (
        building_id IN (
            SELECT id FROM buildings WHERE id = clients.building_id
        )
    );

-- 6. Create RLS policies for rmc_directors table
CREATE POLICY "Users can view RMC directors for their buildings" ON rmc_directors
    FOR SELECT USING (
        building_id IN (
            SELECT id FROM buildings WHERE id = rmc_directors.building_id
        )
    );

CREATE POLICY "Users can insert RMC directors for their buildings" ON rmc_directors
    FOR INSERT WITH CHECK (
        building_id IN (
            SELECT id FROM buildings WHERE id = rmc_directors.building_id
        )
    );

CREATE POLICY "Users can update RMC directors for their buildings" ON rmc_directors
    FOR UPDATE USING (
        building_id IN (
            SELECT id FROM buildings WHERE id = rmc_directors.building_id
        )
    );

CREATE POLICY "Users can delete RMC directors for their buildings" ON rmc_directors
    FOR DELETE USING (
        building_id IN (
            SELECT id FROM buildings WHERE id = rmc_directors.building_id
        )
    );

-- 7. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Create triggers for updated_at
CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rmc_directors_updated_at 
    BEFORE UPDATE ON rmc_directors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 