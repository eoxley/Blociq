-- Complete Compliance Asset Schema for Supabase
-- Migration: 20250123_compliance_schema.sql

-- Main compliance assets table
CREATE TABLE IF NOT EXISTS compliance_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type VARCHAR(100) NOT NULL,
  asset_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  next_due_date DATE,
  last_inspection_date DATE,
  inspection_frequency VARCHAR(50) DEFAULT 'annual',
  is_hrb_only BOOLEAN DEFAULT false,
  is_required BOOLEAN DEFAULT true,
  priority VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance inspections history
CREATE TABLE IF NOT EXISTS compliance_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES compliance_assets(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  inspector_name VARCHAR(255),
  inspection_date DATE NOT NULL,
  next_due_date DATE,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Building compliance configuration
CREATE TABLE IF NOT EXISTS building_compliance_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  is_hrb BOOLEAN DEFAULT false,
  compliance_manager_id UUID REFERENCES auth.users(id),
  auto_notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance asset templates
CREATE TABLE IF NOT EXISTS compliance_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type VARCHAR(100) UNIQUE NOT NULL,
  asset_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  default_frequency VARCHAR(50) DEFAULT 'annual',
  is_required_by_default BOOLEAN DEFAULT true,
  is_hrb_only BOOLEAN DEFAULT false,
  priority VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance notifications
CREATE TABLE IF NOT EXISTS compliance_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES compliance_assets(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  due_date DATE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_assets_building_id ON compliance_assets(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_user_id ON compliance_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_category ON compliance_assets(category);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_status ON compliance_assets(status);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_next_due_date ON compliance_assets(next_due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_inspections_asset_id ON compliance_inspections(asset_id);
CREATE INDEX IF NOT EXISTS idx_compliance_inspections_building_id ON compliance_inspections(building_id);
CREATE INDEX IF NOT EXISTS idx_building_compliance_config_building_id ON building_compliance_config(building_id);

-- Function to update asset status based on due dates
CREATE OR REPLACE FUNCTION update_compliance_asset_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status based on next_due_date
  IF NEW.next_due_date < CURRENT_DATE THEN
    NEW.status = 'overdue';
  ELSIF NEW.next_due_date <= CURRENT_DATE + INTERVAL '30 days' THEN
    NEW.status = 'due_soon';
  ELSIF NEW.last_inspection_date IS NOT NULL THEN
    NEW.status = 'compliant';
  ELSE
    NEW.status = 'pending';
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update status
CREATE TRIGGER trigger_update_compliance_asset_status
  BEFORE UPDATE ON compliance_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_compliance_asset_status();

-- Function to get compliance overview for a user
CREATE OR REPLACE FUNCTION get_user_compliance_overview(user_uuid UUID)
RETURNS TABLE (
  building_id UUID,
  building_name TEXT,
  total_assets INTEGER,
  compliant_assets INTEGER,
  overdue_assets INTEGER,
  due_soon_assets INTEGER,
  pending_assets INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as building_id,
    b.name as building_name,
    COUNT(ca.id)::INTEGER as total_assets,
    COUNT(CASE WHEN ca.status = 'compliant' THEN 1 END)::INTEGER as compliant_assets,
    COUNT(CASE WHEN ca.status = 'overdue' THEN 1 END)::INTEGER as overdue_assets,
    COUNT(CASE WHEN ca.status = 'due_soon' THEN 1 END)::INTEGER as due_soon_assets,
    COUNT(CASE WHEN ca.status = 'pending' THEN 1 END)::INTEGER as pending_assets
  FROM buildings b
  LEFT JOIN compliance_assets ca ON b.id = ca.building_id
  WHERE b.user_id = user_uuid OR EXISTS (
    SELECT 1 FROM building_members bm 
    WHERE bm.building_id = b.id AND bm.user_id = user_uuid
  )
  GROUP BY b.id, b.name
  ORDER BY b.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE compliance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_compliance_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_notifications ENABLE ROW LEVEL SECURITY;

-- Policy for compliance_assets
CREATE POLICY "Users can view compliance assets for buildings they manage" ON compliance_assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM buildings b 
      WHERE b.id = compliance_assets.building_id 
      AND (b.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM building_members bm 
        WHERE bm.building_id = b.id AND bm.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can insert compliance assets for buildings they manage" ON compliance_assets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM buildings b 
      WHERE b.id = compliance_assets.building_id 
      AND (b.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM building_members bm 
        WHERE bm.building_id = b.id AND bm.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can update compliance assets for buildings they manage" ON compliance_assets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM buildings b 
      WHERE b.id = compliance_assets.building_id 
      AND (b.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM building_members bm 
        WHERE bm.building_id = b.id AND bm.user_id = auth.uid()
      ))
    )
  );

-- Policy for compliance_inspections
CREATE POLICY "Users can view inspections for buildings they manage" ON compliance_inspections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM buildings b 
      WHERE b.id = compliance_inspections.building_id 
      AND (b.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM building_members bm 
        WHERE bm.building_id = b.id AND bm.user_id = auth.uid()
      ))
    )
  );

-- Policy for building_compliance_config
CREATE POLICY "Users can view compliance config for buildings they manage" ON building_compliance_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM buildings b 
      WHERE b.id = building_compliance_config.building_id 
      AND (b.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM building_members bm 
        WHERE bm.building_id = b.id AND bm.user_id = auth.uid()
      ))
    )
  );

-- Policy for compliance_notifications
CREATE POLICY "Users can view their own notifications" ON compliance_notifications
  FOR SELECT USING (user_id = auth.uid());

-- Insert default compliance templates
INSERT INTO compliance_templates (asset_type, asset_name, category, description, default_frequency, is_required_by_default, is_hrb_only) VALUES
('fire_alarm_system', 'Fire Alarm System', 'fire_safety', 'Annual inspection and testing of fire alarm system', 'annual', true, false),
('emergency_lighting', 'Emergency Lighting', 'fire_safety', 'Monthly testing of emergency lighting systems', 'monthly', true, false),
('electrical_installation', 'Electrical Installation Condition Report (EICR)', 'electrical', 'Comprehensive electrical safety inspection', 'quinquennial', true, false),
('gas_safety_check', 'Gas Safety Check', 'gas', 'Annual gas appliance safety inspection', 'annual', true, false),
('building_safety_case', 'Building Safety Case', 'building_safety', 'Comprehensive building safety case for HRB', 'ongoing', false, true),
('fire_door_inspection', 'Fire Door Inspection', 'fire_safety', 'Quarterly fire door inspection and maintenance', 'quarterly', true, false),
('water_system', 'Water System Risk Assessment', 'health_safety', 'Annual water system risk assessment', 'annual', true, false),
('asbestos_management', 'Asbestos Management Plan', 'health_safety', 'Ongoing asbestos management and monitoring', 'ongoing', true, false),
('lift_maintenance', 'Lift Maintenance', 'structural', 'Monthly lift maintenance and inspection', 'monthly', true, false),
('roof_inspection', 'Roof Inspection', 'structural', 'Annual roof condition inspection', 'annual', true, false)
ON CONFLICT (asset_type) DO NOTHING;
