"-- Database migrations for BlocIQ AI features" 

-- Create building_assets join table for compliance asset management
CREATE TABLE IF NOT EXISTS building_assets (
  id SERIAL PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  compliance_item_id INTEGER NOT NULL REFERENCES compliance_items(id) ON DELETE CASCADE,
  applies BOOLEAN DEFAULT false,
  last_checked DATE,
  next_due DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(building_id, compliance_item_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_building_assets_building_id ON building_assets(building_id);
CREATE INDEX IF NOT EXISTS idx_building_assets_compliance_item_id ON building_assets(compliance_item_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_building_assets_updated_at 
    BEFORE UPDATE ON building_assets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert UK-specific compliance items
INSERT INTO compliance_items (id, item_type, category, frequency, status) VALUES
(1, 'Fire Risk Assessment', 'Safety', '1 year', 'Not Started'),
(2, 'Emergency Lighting', 'Safety', '6 months', 'Not Started'),
(3, 'Fire Extinguishers', 'Safety', '1 year', 'Not Started'),
(4, 'Lift Service', 'Equipment', '6 months', 'Not Started'),
(5, 'Ventilation Systems', 'Equipment', '1 year', 'Not Started'),
(6, 'Electrical Installation Condition Report (EICR)', 'Electrical', '5 years', 'Not Started'),
(7, 'Gas Safety Certificate', 'Gas', '1 year', 'Not Started'),
(8, 'Water Risk Assessment', 'Health', '2 years', 'Not Started'),
(9, 'Asbestos Management Survey', 'Health', '5 years', 'Not Started'),
(10, 'Energy Performance Certificate (EPC)', 'Energy', '10 years', 'Not Started'),
(11, 'Building Insurance', 'Insurance', '1 year', 'Not Started'),
(12, 'Public Liability Insurance', 'Insurance', '1 year', 'Not Started'),
(13, 'Employers Liability Insurance', 'Insurance', '1 year', 'Not Started'),
(14, 'Roof Inspection', 'Structural', '1 year', 'Not Started'),
(15, 'Drainage Survey', 'Structural', '3 years', 'Not Started'),
(16, 'External Wall Survey', 'Structural', '5 years', 'Not Started'),
(17, 'Communal Area Risk Assessment', 'Safety', '1 year', 'Not Started'),
(18, 'Legionella Risk Assessment', 'Health', '2 years', 'Not Started'),
(19, 'PAT Testing', 'Electrical', '1 year', 'Not Started'),
(20, 'Fire Door Inspection', 'Safety', '6 months', 'Not Started')
ON CONFLICT (id) DO NOTHING; 
