-- BlocIQ Database Schema
-- Property Management System Database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- CORE BUILDING MANAGEMENT TABLES
-- ========================================

-- Buildings table - Core property information
CREATE TABLE IF NOT EXISTS buildings (
  id SERIAL PRIMARY KEY,
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

-- Building setup configuration
CREATE TABLE IF NOT EXISTS building_setup (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  structure_type VARCHAR(50) CHECK (structure_type IN ('Freehold', 'RMC', 'Tripartite')),
  operational_notes TEXT,
  client_type VARCHAR(50) CHECK (client_type IN ('Freeholder Company', 'Board of Directors')),
  client_name VARCHAR(255),
  client_contact VARCHAR(255),
  client_email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(building_id)
);

-- Units within buildings
CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  unit_number VARCHAR(50) NOT NULL,
  type VARCHAR(50),
  floor VARCHAR(20),
  leaseholder_email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaseholders information
CREATE TABLE IF NOT EXISTS leaseholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add leaseholder_id to units table
ALTER TABLE units ADD COLUMN IF NOT EXISTS leaseholder_id UUID REFERENCES leaseholders(id);

-- ========================================
-- COMPLIANCE MANAGEMENT TABLES
-- ========================================

-- Compliance items tracking
CREATE TABLE IF NOT EXISTS compliance_items (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  assigned_to VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Building assets for compliance
CREATE TABLE IF NOT EXISTS building_assets (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  asset_name VARCHAR(255) NOT NULL,
  asset_type VARCHAR(100),
  location VARCHAR(255),
  installation_date DATE,
  last_inspection_date DATE,
  next_inspection_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance documents
CREATE TABLE IF NOT EXISTS compliance_docs (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  compliance_item_id INTEGER REFERENCES compliance_items(id) ON DELETE SET NULL,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100),
  file_path TEXT,
  file_size INTEGER,
  uploaded_by VARCHAR(255),
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT
);

-- Compliance assets (templates/categories)
CREATE TABLE IF NOT EXISTS compliance_assets (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  frequency_months INTEGER,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Building compliance assets (assignments)
CREATE TABLE IF NOT EXISTS building_compliance_assets (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  asset_id INTEGER REFERENCES compliance_assets(id) ON DELETE CASCADE,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(building_id, asset_id)
);

-- ========================================
-- EMAIL MANAGEMENT TABLES
-- ========================================

-- Incoming emails
CREATE TABLE IF NOT EXISTS incoming_emails (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE,
  subject VARCHAR(500),
  sender_email VARCHAR(255),
  sender_name VARCHAR(255),
  recipient_email VARCHAR(255),
  received_at TIMESTAMP WITH TIME ZONE,
  body_text TEXT,
  body_html TEXT,
  attachments JSONB,
  building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
  category VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(50) DEFAULT 'unread',
  handled BOOLEAN DEFAULT false,
  handled_by VARCHAR(255),
  handled_at TIMESTAMP WITH TIME ZONE,
  ai_analysis JSONB,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email history (sent emails)
CREATE TABLE IF NOT EXISTS email_history (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(255),
  subject VARCHAR(500),
  sender_email VARCHAR(255),
  recipient_email VARCHAR(255),
  recipient_name VARCHAR(255),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  body_text TEXT,
  body_html TEXT,
  attachments JSONB,
  building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  email_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email drafts
CREATE TABLE IF NOT EXISTS email_drafts (
  id SERIAL PRIMARY KEY,
  subject VARCHAR(500),
  recipient_email VARCHAR(255),
  recipient_name VARCHAR(255),
  body_text TEXT,
  body_html TEXT,
  building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- DOCUMENT MANAGEMENT TABLES
-- ========================================

-- General documents
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path TEXT,
  file_size INTEGER,
  file_type VARCHAR(100),
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  tags TEXT[],
  is_public BOOLEAN DEFAULT false
);

-- Building documents (specific to buildings)
CREATE TABLE IF NOT EXISTS building_documents (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100),
  file_path TEXT,
  file_size INTEGER,
  uploaded_by VARCHAR(255),
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  tags TEXT[]
);

-- Leases
CREATE TABLE IF NOT EXISTS leases (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
  leaseholder_name VARCHAR(255),
  lease_start_date DATE,
  lease_end_date DATE,
  lease_term_years INTEGER,
  ground_rent_amount DECIMAL(10,2),
  ground_rent_frequency VARCHAR(50),
  service_charge_amount DECIMAL(10,2),
  service_charge_frequency VARCHAR(50),
  document_path TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- USER MANAGEMENT TABLES
-- ========================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  phone VARCHAR(50),
  company VARCHAR(255),
  position VARCHAR(255),
  preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agencies
CREATE TABLE IF NOT EXISTS agencies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  contact_person VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- AI & COMMUNICATION TABLES
-- ========================================

-- AI logs
CREATE TABLE IF NOT EXISTS ai_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100),
  input_data JSONB,
  output_data JSONB,
  model_used VARCHAR(100),
  tokens_used INTEGER,
  processing_time_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat history
CREATE TABLE IF NOT EXISTS chat_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  message TEXT,
  response TEXT,
  building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Communications
CREATE TABLE IF NOT EXISTS communications (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  type VARCHAR(50),
  subject VARCHAR(255),
  content TEXT,
  sender VARCHAR(255),
  recipients TEXT[],
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'draft',
  template_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Communication templates
CREATE TABLE IF NOT EXISTS communication_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  subject VARCHAR(255),
  content TEXT,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- CALENDAR & EVENTS TABLES
-- ========================================

-- Diary entries
CREATE TABLE IF NOT EXISTS diary_entries (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  location VARCHAR(255),
  attendees TEXT[],
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property events
CREATE TABLE IF NOT EXISTS property_events (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  event_type VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  location VARCHAR(255),
  attendees TEXT[],
  status VARCHAR(50) DEFAULT 'scheduled',
  priority VARCHAR(20) DEFAULT 'medium',
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Manual events
CREATE TABLE IF NOT EXISTS manual_events (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE,
  event_time TIME,
  event_type VARCHAR(100),
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar events (Outlook sync)
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  outlook_event_id VARCHAR(255) UNIQUE,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  location VARCHAR(255),
  attendees JSONB,
  is_all_day BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- MAJOR WORKS & PROJECTS TABLES
-- ========================================

-- Major works projects
CREATE TABLE IF NOT EXISTS major_works (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  project_name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(12,2),
  status VARCHAR(50) DEFAULT 'planning',
  contractor VARCHAR(255),
  project_manager VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Major works logs
CREATE TABLE IF NOT EXISTS major_works_logs (
  id SERIAL PRIMARY KEY,
  major_works_id INTEGER REFERENCES major_works(id) ON DELETE CASCADE,
  log_date DATE,
  activity TEXT,
  notes TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- CONTRACTOR MANAGEMENT TABLES
-- ========================================

-- Contractors
CREATE TABLE IF NOT EXISTS contractors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  services TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance contracts
CREATE TABLE IF NOT EXISTS compliance_contracts (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  compliance_asset_id INTEGER REFERENCES compliance_assets(id) ON DELETE CASCADE,
  contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
  contract_start_date DATE,
  contract_end_date DATE,
  contract_value DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- OCCUPIER MANAGEMENT TABLES
-- ========================================

-- Occupiers
CREATE TABLE IF NOT EXISTS occupiers (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  move_in_date DATE,
  move_out_date DATE,
  status VARCHAR(50) DEFAULT 'current',
  is_tenant BOOLEAN DEFAULT true,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- OUTLOOK INTEGRATION TABLES
-- ========================================

-- Outlook tokens
CREATE TABLE IF NOT EXISTS outlook_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Building indexes
CREATE INDEX IF NOT EXISTS idx_buildings_name ON buildings(name);
CREATE INDEX IF NOT EXISTS idx_buildings_council_borough ON buildings(council_borough);

-- Unit indexes
CREATE INDEX IF NOT EXISTS idx_units_building_id ON units(building_id);
CREATE INDEX IF NOT EXISTS idx_units_leaseholder_email ON units(leaseholder_email);

-- Leaseholder indexes
CREATE INDEX IF NOT EXISTS idx_leaseholders_unit_id ON leaseholders(unit_id);
CREATE INDEX IF NOT EXISTS idx_leaseholders_email ON leaseholders(email);

-- Compliance indexes
CREATE INDEX IF NOT EXISTS idx_compliance_items_building_id ON compliance_items(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_items_status ON compliance_items(status);
CREATE INDEX IF NOT EXISTS idx_compliance_items_due_date ON compliance_items(due_date);
CREATE INDEX IF NOT EXISTS idx_building_assets_building_id ON building_assets(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_building_id ON compliance_docs(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_assets_category ON compliance_assets(category);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_building_id ON building_compliance_assets(building_id);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_asset_id ON building_compliance_assets(asset_id);

-- Email indexes
CREATE INDEX IF NOT EXISTS idx_incoming_emails_received_at ON incoming_emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_handled ON incoming_emails(handled);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_unread ON incoming_emails(unread);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_building_id ON incoming_emails(building_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_sender_email ON incoming_emails(sender_email);
CREATE INDEX IF NOT EXISTS idx_email_history_building_id ON email_history(building_id);
CREATE INDEX IF NOT EXISTS idx_email_history_sent_at ON email_history(sent_at DESC);

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_documents_building_id ON documents(building_id);
CREATE INDEX IF NOT EXISTS idx_building_documents_building_id ON building_documents(building_id);
CREATE INDEX IF NOT EXISTS idx_leases_building_id ON leases(building_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON leases(unit_id);

-- Event indexes
CREATE INDEX IF NOT EXISTS idx_diary_entries_building_id ON diary_entries(building_id);
CREATE INDEX IF NOT EXISTS idx_property_events_building_id ON property_events(building_id);
CREATE INDEX IF NOT EXISTS idx_property_events_start_date ON property_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_building_id ON calendar_events(building_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_communications_building_id ON communications(building_id);
CREATE INDEX IF NOT EXISTS idx_communications_sent_at ON communications(sent_at DESC);

-- Major works indexes
CREATE INDEX IF NOT EXISTS idx_major_works_building_id ON major_works(building_id);
CREATE INDEX IF NOT EXISTS idx_major_works_status ON major_works(status);

-- Contractor indexes
CREATE INDEX IF NOT EXISTS idx_compliance_contracts_building_id ON compliance_contracts(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_contracts_compliance_asset_id ON compliance_contracts(compliance_asset_id);
CREATE INDEX IF NOT EXISTS idx_compliance_contracts_contractor_id ON compliance_contracts(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractors_name ON contractors(name);

-- Occupier indexes
CREATE INDEX IF NOT EXISTS idx_occupiers_unit_id ON occupiers(unit_id);
CREATE INDEX IF NOT EXISTS idx_occupiers_status ON occupiers(status);

-- ========================================
-- TRIGGERS AND FUNCTIONS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for building_setup
CREATE TRIGGER update_building_setup_updated_at 
    BEFORE UPDATE ON building_setup 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to log building amendments
CREATE OR REPLACE FUNCTION log_building_amendment()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO building_amendments (
            building_id,
            field_name,
            old_value,
            new_value,
            changed_by,
            change_date
        ) VALUES (
            NEW.id,
            CASE 
                WHEN OLD.name != NEW.name THEN 'name'
                WHEN OLD.address != NEW.address THEN 'address'
                WHEN OLD.unit_count != NEW.unit_count THEN 'unit_count'
                WHEN OLD.building_manager_name != NEW.building_manager_name THEN 'building_manager_name'
                WHEN OLD.building_manager_email != NEW.building_manager_email THEN 'building_manager_email'
                WHEN OLD.building_manager_phone != NEW.building_manager_phone THEN 'building_manager_phone'
                WHEN OLD.emergency_contact_name != NEW.emergency_contact_name THEN 'emergency_contact_name'
                WHEN OLD.emergency_contact_phone != NEW.emergency_contact_phone THEN 'emergency_contact_phone'
                ELSE 'other'
            END,
            CASE 
                WHEN OLD.name != NEW.name THEN OLD.name
                WHEN OLD.address != NEW.address THEN OLD.address
                WHEN OLD.unit_count != NEW.unit_count THEN OLD.unit_count::text
                WHEN OLD.building_manager_name != NEW.building_manager_name THEN OLD.building_manager_name
                WHEN OLD.building_manager_email != NEW.building_manager_email THEN OLD.building_manager_email
                WHEN OLD.building_manager_phone != NEW.building_manager_phone THEN OLD.building_manager_phone
                WHEN OLD.emergency_contact_name != NEW.emergency_contact_name THEN OLD.emergency_contact_name
                WHEN OLD.emergency_contact_phone != NEW.emergency_contact_phone THEN OLD.emergency_contact_phone
                ELSE 'old_value'
            END,
            CASE 
                WHEN OLD.name != NEW.name THEN NEW.name
                WHEN OLD.address != NEW.address THEN NEW.address
                WHEN OLD.unit_count != NEW.unit_count THEN NEW.unit_count::text
                WHEN OLD.building_manager_name != NEW.building_manager_name THEN NEW.building_manager_name
                WHEN OLD.building_manager_email != NEW.building_manager_email THEN NEW.building_manager_email
                WHEN OLD.building_manager_phone != NEW.building_manager_phone THEN NEW.building_manager_phone
                WHEN OLD.emergency_contact_name != NEW.emergency_contact_name THEN NEW.emergency_contact_name
                WHEN OLD.emergency_contact_phone != NEW.emergency_contact_phone THEN NEW.emergency_contact_phone
                ELSE 'new_value'
            END,
            'system',
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Building amendments table for audit trail
CREATE TABLE IF NOT EXISTS building_amendments (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_by VARCHAR(255),
  change_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger for building amendments
CREATE TRIGGER trigger_log_building_amendment
  AFTER UPDATE ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION log_building_amendment();

-- ========================================
-- SAMPLE DATA INSERTS
-- ========================================

-- Insert sample compliance assets
INSERT INTO compliance_assets (category, name, description, frequency_months, is_required) VALUES
('Fire Safety', 'Fire Risk Assessment', 'Comprehensive fire safety assessment of the building', 12, true),
('Fire Safety', 'Fire Alarm Testing', 'Regular testing of fire alarm systems', 1, true),
('Fire Safety', 'Emergency Lighting', 'Testing of emergency lighting systems', 6, true),
('Gas Safety', 'Gas Safety Certificate', 'Annual gas safety inspection and certification', 12, true),
('Electrical', 'Electrical Installation Condition Report', 'Periodic electrical safety inspection', 60, true),
('Lifts', 'Lift Maintenance Certificate', 'Regular lift maintenance and safety certification', 6, true),
('Water', 'Legionella Risk Assessment', 'Assessment of water systems for legionella risk', 12, true),
('Asbestos', 'Asbestos Management Survey', 'Survey and management plan for asbestos', 60, true),
('Energy', 'Energy Performance Certificate', 'Building energy efficiency assessment', 120, true),
('Insurance', 'Building Insurance Certificate', 'Proof of building insurance coverage', 12, true)
ON CONFLICT DO NOTHING;

-- Insert sample contractors
INSERT INTO contractors (name, contact_person, email, phone, services) VALUES
('ABC Fire Safety Ltd', 'John Smith', 'john@abcfire.co.uk', '020 1234 5678', ARRAY['Fire Safety', 'Emergency Lighting']),
('Gas Safe Engineers Ltd', 'Sarah Johnson', 'sarah@gassafe.co.uk', '020 2345 6789', ARRAY['Gas Safety']),
('Electrical Safety First', 'Mike Wilson', 'mike@electricalsafety.co.uk', '020 3456 7890', ARRAY['Electrical Safety']),
('Lift Maintenance Co', 'Emma Davis', 'emma@liftmaintenance.co.uk', '020 4567 8901', ARRAY['Lift Maintenance']),
('Water Safety Solutions', 'David Brown', 'david@watersafety.co.uk', '020 5678 9012', ARRAY['Water Safety', 'Legionella'])
ON CONFLICT DO NOTHING;

COMMIT; 