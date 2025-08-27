-- Complete Compliance Asset Schema for Supabase

-- Main compliance assets table
CREATE TABLE IF NOT EXISTS compliance_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Asset identification
  asset_name VARCHAR(255) NOT NULL,
  asset_type VARCHAR(100) NOT NULL, -- fire_alarm_system, electrical_installation, etc.
  category VARCHAR(50) NOT NULL, -- fire_safety, electrical, gas, structural, environmental, building_safety
  
  -- Compliance details
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_hrb_only BOOLEAN DEFAULT false, -- Only applies to High Risk Buildings
  
  -- Scheduling
  inspection_frequency VARCHAR(50) NOT NULL, -- monthly, quarterly, annual, biennial, etc.
  frequency_months INTEGER, -- Number of months between inspections
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, compliant, due_soon, overdue, non_compliant
  
  -- Dates
  last_inspection_date DATE,
  next_due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Inspector/contractor details
  inspector_name VARCHAR(255),
  inspector_company VARCHAR(255),
  inspector_contact VARCHAR(255),
  
  -- Documentation
  certificate_url TEXT,
  certificate_expiry DATE,
  notes TEXT,
  compliance_reference VARCHAR(100), -- Internal reference number
  
  -- Metadata
  custom_asset BOOLEAN DEFAULT false, -- User-created vs predefined
  regulatory_requirement TEXT, -- Which regulation requires this
  
  -- Cost tracking
  estimated_cost DECIMAL(10,2),
  last_cost DECIMAL(10,2),
  
  CONSTRAINT valid_category CHECK (category IN (
    'fire_safety', 'electrical', 'gas', 'structural', 
    'environmental', 'building_safety', 'health_safety', 'other'
  )),
  
  CONSTRAINT valid_status CHECK (status IN (
    'compliant', 'due_soon', 'overdue', 'pending', 
    'non_compliant', 'in_progress', 'scheduled'
  )),
  
  CONSTRAINT valid_frequency CHECK (inspection_frequency IN (
    'weekly', 'monthly', 'quarterly', 'biannual', 'annual', 
    'biennial', 'triennial', 'quinquennial', 'one_time', 'ongoing'
  ))
);

-- Compliance inspections/records table
CREATE TABLE IF NOT EXISTS compliance_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compliance_asset_id UUID REFERENCES compliance_assets(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Inspection details
  inspection_date DATE NOT NULL,
  inspection_type VARCHAR(50) DEFAULT 'routine', -- routine, remedial, emergency
  
  -- Results
  result VARCHAR(50) NOT NULL, -- pass, fail, advisory, partial
  score INTEGER, -- Numerical score if applicable
  
  -- Inspector details
  inspector_name VARCHAR(255) NOT NULL,
  inspector_company VARCHAR(255),
  inspector_certification VARCHAR(255),
  inspector_contact VARCHAR(255),
  
  -- Documentation
  certificate_number VARCHAR(100),
  certificate_url TEXT,
  report_url TEXT,
  photos JSONB, -- Array of photo URLs
  
  -- Findings
  findings TEXT,
  recommendations TEXT,
  actions_required TEXT,
  
  -- Follow-up
  next_inspection_due DATE,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  
  -- Compliance
  compliant BOOLEAN NOT NULL,
  compliance_notes TEXT,
  
  -- Costs
  inspection_cost DECIMAL(10,2),
  remedial_cost_estimate DECIMAL(10,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_result CHECK (result IN ('pass', 'fail', 'advisory', 'partial', 'pending')),
  CONSTRAINT valid_inspection_type CHECK (inspection_type IN ('routine', 'remedial', 'emergency', 'initial'))
);

-- Building compliance configuration
CREATE TABLE IF NOT EXISTS building_compliance_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Building characteristics
  is_hrb BOOLEAN DEFAULT false, -- High Risk Building
  building_height_meters DECIMAL(5,2),
  number_of_floors INTEGER,
  number_of_units INTEGER,
  building_use VARCHAR(100), -- residential, mixed_use, commercial
  construction_year INTEGER,
  
  -- Compliance settings
  active_categories JSONB DEFAULT '[]'::jsonb, -- Which compliance categories are active
  custom_requirements JSONB DEFAULT '{}'::jsonb, -- Building-specific requirements
  
  -- Notifications
  notification_days_advance INTEGER DEFAULT 30, -- How many days before due date to notify
  notification_email VARCHAR(255),
  notification_enabled BOOLEAN DEFAULT true,
  
  -- Management
  property_manager VARCHAR(255),
  management_company VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance templates (predefined asset types)
CREATE TABLE IF NOT EXISTS compliance_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identification
  asset_type VARCHAR(100) NOT NULL UNIQUE,
  asset_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  
  -- Default settings
  description TEXT,
  default_frequency VARCHAR(50) NOT NULL,
  default_frequency_months INTEGER,
  is_required_by_default BOOLEAN DEFAULT false,
  is_hrb_only BOOLEAN DEFAULT false,
  
  -- Regulatory information
  regulatory_requirement TEXT,
  legislation_reference TEXT,
  
  -- Template metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance reminders/notifications
CREATE TABLE IF NOT EXISTS compliance_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compliance_asset_id UUID REFERENCES compliance_assets(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification details
  notification_type VARCHAR(50) NOT NULL, -- due_soon, overdue, completed, failed
  notification_date DATE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Recipients
  recipient_email VARCHAR(255),
  recipient_name VARCHAR(255),
  
  -- Message
  subject VARCHAR(255),
  message TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, cancelled
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_notification_type CHECK (notification_type IN (
    'due_soon', 'overdue', 'completed', 'failed', 'reminder', 'scheduled'
  ))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_assets_building_id ON compliance_assets(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_user_id ON compliance_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_status ON compliance_assets(status);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_due_date ON compliance_assets(next_due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_category ON compliance_assets(category);

CREATE INDEX IF NOT EXISTS idx_compliance_inspections_asset_id ON compliance_inspections(compliance_asset_id);
CREATE INDEX IF NOT EXISTS idx_compliance_inspections_building_id ON compliance_inspections(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_inspections_date ON compliance_inspections(inspection_date);

CREATE INDEX IF NOT EXISTS idx_compliance_notifications_user_id ON compliance_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_notifications_status ON compliance_notifications(status);
CREATE INDEX IF NOT EXISTS idx_compliance_notifications_date ON compliance_notifications(notification_date);

-- RLS (Row Level Security) policies
ALTER TABLE compliance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_compliance_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own compliance data
CREATE POLICY "Users can view their own compliance assets" ON compliance_assets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own compliance assets" ON compliance_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own compliance assets" ON compliance_assets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own compliance assets" ON compliance_assets
  FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for other tables
CREATE POLICY "Users can view their own compliance inspections" ON compliance_inspections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own compliance inspections" ON compliance_inspections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own compliance inspections" ON compliance_inspections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own building compliance config" ON building_compliance_config
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own building compliance config" ON building_compliance_config
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own compliance notifications" ON compliance_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Templates are readable by all authenticated users
ALTER TABLE compliance_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates are readable by all authenticated users" ON compliance_templates
  FOR SELECT TO authenticated USING (true);

-- Functions to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_compliance_assets_updated_at BEFORE UPDATE ON compliance_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_inspections_updated_at BEFORE UPDATE ON compliance_inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_building_compliance_config_updated_at BEFORE UPDATE ON building_compliance_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate next due date based on frequency
CREATE OR REPLACE FUNCTION calculate_next_due_date(last_inspection DATE, frequency VARCHAR, frequency_months INTEGER)
RETURNS DATE AS $$
BEGIN
  IF frequency = 'weekly' THEN
    RETURN last_inspection + INTERVAL '1 week';
  ELSIF frequency = 'monthly' THEN
    RETURN last_inspection + INTERVAL '1 month';
  ELSIF frequency = 'quarterly' THEN
    RETURN last_inspection + INTERVAL '3 months';
  ELSIF frequency = 'biannual' THEN
    RETURN last_inspection + INTERVAL '6 months';
  ELSIF frequency = 'annual' THEN
    RETURN last_inspection + INTERVAL '1 year';
  ELSIF frequency = 'biennial' THEN
    RETURN last_inspection + INTERVAL '2 years';
  ELSIF frequency = 'triennial' THEN
    RETURN last_inspection + INTERVAL '3 years';
  ELSIF frequency = 'quinquennial' THEN
    RETURN last_inspection + INTERVAL '5 years';
  ELSIF frequency_months IS NOT NULL THEN
    RETURN last_inspection + (frequency_months || ' months')::INTERVAL;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update next_due_date when last_inspection_date changes
CREATE OR REPLACE FUNCTION update_next_due_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_inspection_date IS NOT NULL AND NEW.last_inspection_date != OLD.last_inspection_date THEN
    NEW.next_due_date = calculate_next_due_date(NEW.last_inspection_date, NEW.inspection_frequency, NEW.frequency_months);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_next_due_date BEFORE UPDATE ON compliance_assets
    FOR EACH ROW EXECUTE FUNCTION update_next_due_date();
