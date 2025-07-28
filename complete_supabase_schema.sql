-- ========================================
-- BLOCIQ COMPLETE SUPABASE SCHEMA
-- Property Management System Database
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- CORE BUILDING MANAGEMENT TABLES
-- ========================================

-- Buildings table - Core property information
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  notes TEXT,
  key_access_notes TEXT,
  entry_code VARCHAR(50),
  fire_panel_location VARCHAR(255),
  demo_ready BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Building setup configuration
CREATE TABLE IF NOT EXISTS building_setup (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  unit_number VARCHAR(50) NOT NULL,
  type VARCHAR(50),
  floor VARCHAR(20),
  leaseholder_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaseholders information
CREATE TABLE IF NOT EXISTS leaseholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add leaseholder_id foreign key to units table (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'units_leaseholder_id_fkey' 
        AND table_name = 'units'
    ) THEN
        ALTER TABLE units ADD CONSTRAINT units_leaseholder_id_fkey 
          FOREIGN KEY (leaseholder_id) REFERENCES leaseholders(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ========================================
-- COMPLIANCE MANAGEMENT TABLES
-- ========================================

-- Compliance assets (templates/categories)
CREATE TABLE IF NOT EXISTS compliance_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  frequency_months INTEGER,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Building compliance assets (assignments)
CREATE TABLE IF NOT EXISTS building_compliance_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES compliance_assets(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'overdue', 'completed', 'expired')),
  notes TEXT,
  next_due_date DATE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  latest_document_id UUID,
  last_renewed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(building_id, asset_id)
);

-- Compliance documents
CREATE TABLE IF NOT EXISTS compliance_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  compliance_asset_id UUID REFERENCES compliance_assets(id) ON DELETE SET NULL,
  document_url TEXT NOT NULL,
  title VARCHAR(255),
  summary TEXT,
  extracted_date DATE,
  doc_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add latest_document_id foreign key to building_compliance_assets (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'building_compliance_assets_latest_document_id_fkey' 
        AND table_name = 'building_compliance_assets'
    ) THEN
        ALTER TABLE building_compliance_assets ADD CONSTRAINT building_compliance_assets_latest_document_id_fkey 
          FOREIGN KEY (latest_document_id) REFERENCES compliance_documents(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ========================================
-- EMAIL MANAGEMENT TABLES
-- ========================================

-- Incoming emails
CREATE TABLE IF NOT EXISTS incoming_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id VARCHAR(255) UNIQUE,
  subject VARCHAR(500),
  from_email VARCHAR(255),
  body_preview TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  unread BOOLEAN DEFAULT true,
  handled BOOLEAN DEFAULT false,
  pinned BOOLEAN DEFAULT false,
  flag_status VARCHAR(50) DEFAULT 'none' CHECK (flag_status IN ('none', 'flagged', 'urgent')),
  categories TEXT[],
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  leaseholder_id UUID REFERENCES leaseholders(id) ON DELETE SET NULL,
  thread_id VARCHAR(255),
  tag VARCHAR(100),
  unit VARCHAR(50),
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email history (sent emails)
CREATE TABLE IF NOT EXISTS email_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id VARCHAR(255),
  subject VARCHAR(500),
  sender_email VARCHAR(255),
  recipient_email VARCHAR(255),
  recipient_name VARCHAR(255),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  body_text TEXT,
  body_html TEXT,
  attachments JSONB,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  email_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email drafts
CREATE TABLE IF NOT EXISTS email_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id UUID REFERENCES incoming_emails(id) ON DELETE CASCADE,
  draft_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- DOCUMENT MANAGEMENT TABLES
-- ========================================

-- Building documents (specific to buildings)
CREATE TABLE IF NOT EXISTS building_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  leaseholder_id UUID REFERENCES leaseholders(id) ON DELETE SET NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leases
CREATE TABLE IF NOT EXISTS leases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  doc_type VARCHAR(100),
  doc_url TEXT,
  start_date DATE,
  expiry_date DATE,
  is_headlease BOOLEAN DEFAULT false,
  uploaded_by UUID,
  user_id UUID,
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
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  agency_id UUID,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  role VARCHAR(50),
  agency_id UUID,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agencies
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  tone TEXT,
  policies TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add agency foreign keys (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_agency_id_fkey' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_agency_id_fkey 
          FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_agency_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_agency_id_fkey 
          FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ========================================
-- AI & COMMUNICATION TABLES
-- ========================================

-- AI logs
CREATE TABLE IF NOT EXISTS ai_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat history
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  question TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Communications
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  leaseholder_id UUID REFERENCES leaseholders(id) ON DELETE SET NULL,
  type VARCHAR(50),
  subject VARCHAR(255),
  content TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  template_id INTEGER,
  send_method VARCHAR(50),
  recipient_ids UUID[],
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- CALENDAR & EVENTS TABLES
-- ========================================

-- Diary entries
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  entry_text TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property events
CREATE TABLE IF NOT EXISTS property_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  event_type VARCHAR(100),
  category VARCHAR(100),
  outlook_event_id VARCHAR(255) UNIQUE,
  location VARCHAR(255),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- MAJOR WORKS & PROJECTS TABLES
-- ========================================

-- Major works projects
CREATE TABLE IF NOT EXISTS major_works (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  project_name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  budget DECIMAL(12,2),
  status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold')),
  contractor VARCHAR(255),
  project_manager VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Major works logs
CREATE TABLE IF NOT EXISTS major_works_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  major_works_id UUID REFERENCES major_works(id) ON DELETE CASCADE,
  log_date DATE,
  activity TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- CONTRACTOR MANAGEMENT TABLES
-- ========================================

-- Contractors
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  notes TEXT,
  inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance contracts
CREATE TABLE IF NOT EXISTS compliance_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  compliance_asset_id UUID REFERENCES compliance_assets(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
  start_date DATE,
  end_date DATE,
  contract_file_url TEXT,
  inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- OCCUPIER MANAGEMENT TABLES
-- ========================================

-- Occupiers
CREATE TABLE IF NOT EXISTS occupiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  start_date DATE,
  end_date DATE,
  rent_amount DECIMAL(10,2),
  rent_frequency VARCHAR(50),
  status VARCHAR(50) DEFAULT 'current' CHECK (status IN ('current', 'former', 'pending')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- OUTLOOK INTEGRATION TABLES
-- ========================================

-- Outlook tokens
CREATE TABLE IF NOT EXISTS outlook_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- DOCUMENT ANALYSIS TABLES
-- ========================================

-- Document analysis
CREATE TABLE IF NOT EXISTS document_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES building_documents(id) ON DELETE CASCADE,
  extracted_text TEXT,
  summary TEXT,
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document queries
CREATE TABLE IF NOT EXISTS document_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  document_id UUID REFERENCES building_documents(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- BUILDING AMENDMENTS AUDIT TRAIL
-- ========================================

-- Building amendments
CREATE TABLE IF NOT EXISTS building_amendments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_type VARCHAR(50) NOT NULL,
  change_description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Building indexes
CREATE INDEX IF NOT EXISTS idx_buildings_name ON buildings(name);
CREATE INDEX IF NOT EXISTS idx_buildings_council_borough ON buildings(council_borough);
CREATE INDEX IF NOT EXISTS idx_buildings_created_at ON buildings(created_at);

-- Unit indexes
CREATE INDEX IF NOT EXISTS idx_units_building_id ON units(building_id);
CREATE INDEX IF NOT EXISTS idx_units_leaseholder_id ON units(leaseholder_id);
CREATE INDEX IF NOT EXISTS idx_units_unit_number ON units(unit_number);

-- Leaseholder indexes
CREATE INDEX IF NOT EXISTS idx_leaseholders_unit_id ON leaseholders(unit_id);
CREATE INDEX IF NOT EXISTS idx_leaseholders_email ON leaseholders(email);

-- Compliance indexes
CREATE INDEX IF NOT EXISTS idx_compliance_assets_category ON compliance_assets(category);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_building_id ON building_compliance_assets(building_id);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_asset_id ON building_compliance_assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_status ON building_compliance_assets(status);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_next_due_date ON building_compliance_assets(next_due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_building_id ON compliance_documents(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_asset_id ON compliance_documents(compliance_asset_id);

-- Email indexes
CREATE INDEX IF NOT EXISTS idx_incoming_emails_received_at ON incoming_emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_handled ON incoming_emails(handled);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_unread ON incoming_emails(unread);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_building_id ON incoming_emails(building_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_from_email ON incoming_emails(from_email);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_thread_id ON incoming_emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_history_building_id ON email_history(building_id);
CREATE INDEX IF NOT EXISTS idx_email_history_sent_at ON email_history(sent_at DESC);

-- Document indexes
CREATE INDEX IF NOT EXISTS idx_building_documents_building_id ON building_documents(building_id);
CREATE INDEX IF NOT EXISTS idx_building_documents_unit_id ON building_documents(unit_id);
CREATE INDEX IF NOT EXISTS idx_building_documents_type ON building_documents(type);
CREATE INDEX IF NOT EXISTS idx_leases_building_id ON leases(building_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_expiry_date ON leases(expiry_date);

-- Event indexes
CREATE INDEX IF NOT EXISTS idx_diary_entries_building_id ON diary_entries(building_id);
CREATE INDEX IF NOT EXISTS idx_property_events_building_id ON property_events(building_id);
CREATE INDEX IF NOT EXISTS idx_property_events_start_time ON property_events(start_time);
CREATE INDEX IF NOT EXISTS idx_property_events_outlook_event_id ON property_events(outlook_event_id);

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_communications_building_id ON communications(building_id);
CREATE INDEX IF NOT EXISTS idx_communications_sent_at ON communications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_type ON communications(type);

-- Major works indexes
CREATE INDEX IF NOT EXISTS idx_major_works_building_id ON major_works(building_id);
CREATE INDEX IF NOT EXISTS idx_major_works_status ON major_works(status);
CREATE INDEX IF NOT EXISTS idx_major_works_logs_major_works_id ON major_works_logs(major_works_id);

-- Contractor indexes
CREATE INDEX IF NOT EXISTS idx_compliance_contracts_building_id ON compliance_contracts(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_contracts_asset_id ON compliance_contracts(compliance_asset_id);
CREATE INDEX IF NOT EXISTS idx_compliance_contracts_contractor_id ON compliance_contracts(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractors_name ON contractors(name);

-- Occupier indexes
CREATE INDEX IF NOT EXISTS idx_occupiers_unit_id ON occupiers(unit_id);
CREATE INDEX IF NOT EXISTS idx_occupiers_status ON occupiers(status);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_agency_id ON users(agency_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

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

-- Apply updated_at triggers to all tables with updated_at columns
CREATE TRIGGER update_buildings_updated_at 
    BEFORE UPDATE ON buildings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_building_setup_updated_at 
    BEFORE UPDATE ON building_setup 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at 
    BEFORE UPDATE ON units 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaseholders_updated_at 
    BEFORE UPDATE ON leaseholders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_assets_updated_at 
    BEFORE UPDATE ON compliance_assets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_building_compliance_assets_updated_at 
    BEFORE UPDATE ON building_compliance_assets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_documents_updated_at 
    BEFORE UPDATE ON compliance_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incoming_emails_updated_at 
    BEFORE UPDATE ON incoming_emails 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_drafts_updated_at 
    BEFORE UPDATE ON email_drafts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_building_documents_updated_at 
    BEFORE UPDATE ON building_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leases_updated_at 
    BEFORE UPDATE ON leases 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agencies_updated_at 
    BEFORE UPDATE ON agencies 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communications_updated_at 
    BEFORE UPDATE ON communications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communication_templates_updated_at 
    BEFORE UPDATE ON communication_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_events_updated_at 
    BEFORE UPDATE ON property_events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_major_works_updated_at 
    BEFORE UPDATE ON major_works 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractors_updated_at 
    BEFORE UPDATE ON contractors 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_contracts_updated_at 
    BEFORE UPDATE ON compliance_contracts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_occupiers_updated_at 
    BEFORE UPDATE ON occupiers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outlook_tokens_updated_at 
    BEFORE UPDATE ON outlook_tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_setup ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaseholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_compliance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incoming_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE major_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE major_works_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE occupiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_amendments ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can see data related to their agency/building)
-- Note: These are basic policies - you may need to customize based on your specific access control requirements

-- Buildings policy - users can see buildings they have access to
CREATE POLICY "Users can view buildings they have access to" ON buildings
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE building_id = buildings.id
      UNION
      SELECT id FROM users WHERE building_id = buildings.id
    )
  );

-- Similar policies for other tables...
-- (Add specific RLS policies based on your access control requirements)

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
INSERT INTO contractors (name, email, phone, notes) VALUES
('ABC Fire Safety Ltd', 'john@abcfire.co.uk', '020 1234 5678', 'Fire safety specialists'),
('Gas Safe Engineers Ltd', 'sarah@gassafe.co.uk', '020 2345 6789', 'Gas safety certified'),
('Electrical Safety First', 'mike@electricalsafety.co.uk', '020 3456 7890', 'Electrical safety experts'),
('Lift Maintenance Co', 'emma@liftmaintenance.co.uk', '020 4567 8901', 'Lift maintenance specialists'),
('Water Safety Solutions', 'david@watersafety.co.uk', '020 5678 9012', 'Water safety and legionella specialists')
ON CONFLICT DO NOTHING;

COMMIT; 