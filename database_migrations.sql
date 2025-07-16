-- BlocIQ Database Migrations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create buildings table if it doesn't exist
CREATE TABLE IF NOT EXISTS buildings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  unit_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new building info fields
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS access_notes TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS sites_staff TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS parking_info TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS council_borough VARCHAR(255);

-- Add new building information fields
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_manager_name VARCHAR(255);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_manager_email VARCHAR(255);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_manager_phone VARCHAR(50);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_age VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS construction_type VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS total_floors VARCHAR(10);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS lift_available VARCHAR(10);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS heating_type VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS hot_water_type VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS waste_collection_day VARCHAR(20);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS recycling_info TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_insurance_provider VARCHAR(255);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_insurance_expiry DATE;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS fire_safety_status VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS asbestos_status VARCHAR(100);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS energy_rating VARCHAR(10);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS service_charge_frequency VARCHAR(50);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS ground_rent_amount DECIMAL(10,2);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS ground_rent_frequency VARCHAR(50);

-- Create building_setup table for detailed building configuration
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

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_building_setup_updated_at 
    BEFORE UPDATE ON building_setup 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create units table if it doesn't exist
CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  unit_number VARCHAR(50) NOT NULL,
  type VARCHAR(50),
  floor VARCHAR(20),
  leaseholder_email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leaseholders table if it doesn't exist
CREATE TABLE IF NOT EXISTS leaseholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add leaseholder_id column to units table if it doesn't exist
ALTER TABLE units ADD COLUMN IF NOT EXISTS leaseholder_id UUID REFERENCES leaseholders(id);

-- Create compliance_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS compliance_items (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  item_type VARCHAR(100) NOT NULL,
  category VARCHAR(100),
  frequency VARCHAR(100),
  last_done DATE,
  next_due DATE,
  status VARCHAR(50),
  notes TEXT,
  assigned_to VARCHAR(255),
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create building_assets table for compliance tracking
CREATE TABLE IF NOT EXISTS building_assets (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  compliance_item_id INTEGER REFERENCES compliance_items(id) ON DELETE CASCADE,
  applies BOOLEAN DEFAULT true,
  last_checked DATE,
  next_due DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create compliance_docs table for document storage
CREATE TABLE IF NOT EXISTS compliance_docs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  compliance_item_id INTEGER REFERENCES compliance_items(id) ON DELETE SET NULL,
  doc_type VARCHAR(100),
  doc_url TEXT,
  start_date DATE,
  expiry_date DATE,
  reminder_days INTEGER DEFAULT 30,
  uploaded_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create incoming_emails table if it doesn't exist
CREATE TABLE IF NOT EXISTS incoming_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  subject VARCHAR(500),
  from_email VARCHAR(255),
  body_preview TEXT,
  received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  handled BOOLEAN DEFAULT FALSE,
  unread BOOLEAN DEFAULT TRUE,
  pinned BOOLEAN DEFAULT FALSE,
  tag VARCHAR(100),
  unit VARCHAR(50),
  thread_id VARCHAR(255),
  message_id VARCHAR(255)
);

-- Create email_drafts table
CREATE TABLE IF NOT EXISTS email_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id UUID REFERENCES incoming_emails(id) ON DELETE CASCADE,
  draft_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_history table
CREATE TABLE IF NOT EXISTS email_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id UUID REFERENCES incoming_emails(id) ON DELETE CASCADE,
  sent_text TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  uploaded_by VARCHAR(255),
  agency_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leases table if it doesn't exist
CREATE TABLE IF NOT EXISTS leases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
  doc_type VARCHAR(100),
  doc_url TEXT,
  start_date DATE,
  expiry_date DATE,
  is_headlease BOOLEAN DEFAULT FALSE,
  uploaded_by VARCHAR(255),
  user_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(100),
  agency_id VARCHAR(255),
  building_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255),
  role VARCHAR(100),
  agency_id VARCHAR(255),
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agencies table if it doesn't exist
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  tone TEXT,
  policies TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  agency_id VARCHAR(255) REFERENCES agencies(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  building_id VARCHAR(255),
  question TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create communications table if it doesn't exist
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id VARCHAR(255),
  sender_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  recipient VARCHAR(255),
  subject VARCHAR(500),
  body TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create diary_entries table if it doesn't exist
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  created_by VARCHAR(255),
  entry_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create drafts table if it doesn't exist
CREATE TABLE IF NOT EXISTS drafts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  building VARCHAR(255),
  category VARCHAR(100),
  input TEXT,
  output TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mail_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS mail_templates (
  id SERIAL PRIMARY KEY,
  building_id VARCHAR(255),
  created_by VARCHAR(255),
  subject VARCHAR(500),
  body TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create communication_templates table for reusable communication templates
CREATE TABLE IF NOT EXISTS communication_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'letter', 'announcement')),
  subject VARCHAR(500),
  content TEXT NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create building_documents table for storing generated documents
CREATE TABLE IF NOT EXISTS building_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  leaseholder_id UUID REFERENCES leaseholders(id) ON DELETE SET NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create property_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS property_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  event_type VARCHAR(100),
  category VARCHAR(100),
  outlook_event_id VARCHAR(255),
  location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create occupiers table for sub-tenancies
CREATE TABLE IF NOT EXISTS occupiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  start_date DATE,
  end_date DATE,
  rent_amount DECIMAL(10,2),
  rent_frequency VARCHAR(20) DEFAULT 'monthly',
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create building amendments table to track changes
CREATE TABLE IF NOT EXISTS building_amendments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_type VARCHAR(20) NOT NULL, -- 'update', 'add', 'delete'
  change_description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_buildings_name ON buildings(name);
CREATE INDEX IF NOT EXISTS idx_units_building_id ON units(building_id);
CREATE INDEX IF NOT EXISTS idx_leaseholders_unit_id ON leaseholders(unit_id);
CREATE INDEX IF NOT EXISTS idx_compliance_items_building_id ON compliance_items(building_id);
CREATE INDEX IF NOT EXISTS idx_building_assets_building_id ON building_assets(building_id);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_building_id ON compliance_docs(building_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_building_id ON incoming_emails(building_id);
CREATE INDEX IF NOT EXISTS idx_leases_building_id ON leases(building_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_building_id ON diary_entries(building_id);
CREATE INDEX IF NOT EXISTS idx_property_events_building_id ON property_events(building_id);
CREATE INDEX IF NOT EXISTS idx_building_setup_building_id ON building_setup(building_id);
CREATE INDEX IF NOT EXISTS idx_occupiers_unit_id ON occupiers(unit_id);
CREATE INDEX IF NOT EXISTS idx_occupiers_status ON occupiers(status);
CREATE INDEX IF NOT EXISTS idx_building_amendments_building_id ON building_amendments(building_id);
CREATE INDEX IF NOT EXISTS idx_building_amendments_created_at ON building_amendments(created_at);

-- Add RLS policies for occupiers
ALTER TABLE occupiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view occupiers for their buildings" ON occupiers
  FOR SELECT USING (
    unit_id IN (
      SELECT id FROM units 
      WHERE building_id IN (
        SELECT building_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert occupiers for their buildings" ON occupiers
  FOR INSERT WITH CHECK (
    unit_id IN (
      SELECT id FROM units 
      WHERE building_id IN (
        SELECT building_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update occupiers for their buildings" ON occupiers
  FOR UPDATE USING (
    unit_id IN (
      SELECT id FROM units 
      WHERE building_id IN (
        SELECT building_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete occupiers for their buildings" ON occupiers
  FOR DELETE USING (
    unit_id IN (
      SELECT id FROM units 
      WHERE building_id IN (
        SELECT building_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Add RLS policies for building amendments
ALTER TABLE building_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view amendments for their buildings" ON building_amendments
  FOR SELECT USING (
    building_id IN (
      SELECT building_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert amendments for their buildings" ON building_amendments
  FOR INSERT WITH CHECK (
    building_id IN (
      SELECT building_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Function to automatically log building amendments
CREATE OR REPLACE FUNCTION log_building_amendment()
RETURNS TRIGGER AS $$
BEGIN
  -- Log changes when building information is updated
  IF TG_OP = 'UPDATE' THEN
    -- Check each field for changes
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      INSERT INTO building_amendments (building_id, field_name, old_value, new_value, change_type, change_description)
      VALUES (NEW.id, 'name', OLD.name, NEW.name, 'update', 'Building name updated');
    END IF;
    
    IF OLD.address IS DISTINCT FROM NEW.address THEN
      INSERT INTO building_amendments (building_id, field_name, old_value, new_value, change_type, change_description)
      VALUES (NEW.id, 'address', OLD.address, NEW.address, 'update', 'Building address updated');
    END IF;
    
    IF OLD.access_notes IS DISTINCT FROM NEW.access_notes THEN
      INSERT INTO building_amendments (building_id, field_name, old_value, new_value, change_type, change_description)
      VALUES (NEW.id, 'access_notes', OLD.access_notes, NEW.access_notes, 'update', 'Access notes updated');
    END IF;
    
    IF OLD.sites_staff IS DISTINCT FROM NEW.sites_staff THEN
      INSERT INTO building_amendments (building_id, field_name, old_value, new_value, change_type, change_description)
      VALUES (NEW.id, 'sites_staff', OLD.sites_staff, NEW.sites_staff, 'update', 'Sites staff updated');
    END IF;
    
    IF OLD.parking_info IS DISTINCT FROM NEW.parking_info THEN
      INSERT INTO building_amendments (building_id, field_name, old_value, new_value, change_type, change_description)
      VALUES (NEW.id, 'parking_info', OLD.parking_info, NEW.parking_info, 'update', 'Parking information updated');
    END IF;
    
    IF OLD.council_borough IS DISTINCT FROM NEW.council_borough THEN
      INSERT INTO building_amendments (building_id, field_name, old_value, new_value, change_type, change_description)
      VALUES (NEW.id, 'council_borough', OLD.council_borough, NEW.council_borough, 'update', 'Council borough updated');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for building amendments
DROP TRIGGER IF EXISTS trigger_log_building_amendment ON buildings;
CREATE TRIGGER trigger_log_building_amendment
  AFTER UPDATE ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION log_building_amendment();

-- Insert sample data for testing
INSERT INTO buildings (id, name, address, unit_count) VALUES 
(1, 'Ashwood House', '123 Ashwood Street, London SW1 1AA', 10),
(2, 'Maple Court', '456 Maple Avenue, London W1 2BB', 8),
(3, 'Oak Gardens', '789 Oak Road, London E1 3CC', 12)
ON CONFLICT (id) DO NOTHING;

-- Insert sample building setup data
INSERT INTO building_setup (building_id, structure_type, operational_notes, client_type, client_name, client_contact, client_email) VALUES 
(1, 'RMC', 'Entry code: 1234, Meter room: Basement, Key safe: Front entrance', 'Board of Directors', 'Ashwood House RMC Ltd', 'John Smith', 'directors@ashwoodhouse.com'),
(2, 'Freehold', 'Entry code: 5678, Parking: Permit required, Access: 24/7', 'Freeholder Company', 'Maple Properties Ltd', 'Sarah Johnson', 'info@mapleproperties.com'),
(3, 'Tripartite', 'Entry code: 9012, Concierge: Mon-Fri 8am-6pm, Maintenance: 24/7', 'Board of Directors', 'Oak Gardens Management Ltd', 'Michael Brown', 'management@oakgardens.com')
ON CONFLICT (building_id) DO NOTHING; 

-- This script creates test data for Ashwood House with units, leaseholders, leases, and emails

-- 1. Create buildings table if it doesn't exist
CREATE TABLE IF NOT EXISTS buildings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    unit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add new building info fields
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS access_notes TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS sites_staff TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS parking_info TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS council_borough VARCHAR(255);

-- 3. Insert Ashwood House building
INSERT INTO buildings (id, name, address, unit_count, access_notes, sites_staff, parking_info, council_borough) 
VALUES (1, 'Sample House', '123 Sample Street, London SW1 1AA', 10, 'Entry code: 1234, Meter room: Basement, Key safe: Front entrance', 'Concierge: John Smith (Mon-Fri 8am-6pm), Cleaner: Maria Garcia (Daily 9am-11am)', '1 permit bay per unit. No visitor parking. Permit required from council.', 'Westminster')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    unit_count = EXCLUDED.unit_count,
    access_notes = EXCLUDED.access_notes,
    sites_staff = EXCLUDED.sites_staff,
    parking_info = EXCLUDED.parking_info,
    council_borough = EXCLUDED.council_borough;

-- 4. Insert leaseholders
INSERT INTO leaseholders (id, name, email, phone) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'John Smith', 'john.smith@email.com', '+44 20 7123 4567'),
('550e8400-e29b-41d4-a716-446655440002', 'Sarah Johnson', 'sarah.johnson@email.com', '+44 20 7123 4568'),
('550e8400-e29b-41d4-a716-446655440003', 'Michael Brown', 'michael.brown@email.com', '+44 20 7123 4569'),
('550e8400-e29b-41d4-a716-446655440004', 'Emma Davis', 'emma.davis@email.com', '+44 20 7123 4570'),
('550e8400-e29b-41d4-a716-446655440005', 'David Wilson', 'david.wilson@email.com', '+44 20 7123 4571'),
('550e8400-e29b-41d4-a716-446655440006', 'Lisa Anderson', 'lisa.anderson@email.com', '+44 20 7123 4572'),
('550e8400-e29b-41d4-a716-446655440007', 'Robert Taylor', 'robert.taylor@email.com', '+44 20 7123 4573'),
('550e8400-e29b-41d4-a716-446655440008', 'Jennifer Martinez', 'jennifer.martinez@email.com', '+44 20 7123 4574'),
('550e8400-e29b-41d4-a716-446655440009', 'Christopher Lee', 'christopher.lee@email.com', '+44 20 7123 4575'),
('550e8400-e29b-41d4-a716-446655440010', 'Amanda Garcia', 'amanda.garcia@email.com', '+44 20 7123 4576')
ON CONFLICT (id) DO NOTHING;

-- 5. Insert 10 units for Ashwood House
INSERT INTO units (id, building_id, unit_number, type, floor, leaseholder_email) VALUES
(1, 1, 'Flat 1', '2 Bedroom', 'Ground', 'john.smith@email.com'),
(2, 1, 'Flat 2', '1 Bedroom', 'Ground', 'sarah.johnson@email.com'),
(3, 1, 'Flat 3', '2 Bedroom', '1st', 'michael.brown@email.com'),
(4, 1, 'Flat 4', '1 Bedroom', '1st', 'emma.davis@email.com'),
(5, 1, 'Flat 5', '3 Bedroom', '2nd', 'david.wilson@email.com'),
(6, 1, 'Flat 6', '2 Bedroom', '2nd', 'lisa.anderson@email.com'),
(7, 1, 'Flat 7', '1 Bedroom', '3rd', 'robert.taylor@email.com'),
(8, 1, 'Flat 8', '2 Bedroom', '3rd', 'jennifer.martinez@email.com'),
(9, 1, 'Flat 9', '1 Bedroom', '4th', 'christopher.lee@email.com'),
(10, 1, 'Flat 10', '2 Bedroom', '4th', 'amanda.garcia@email.com')
ON CONFLICT (id) DO NOTHING;

-- 6. Create leases table if it doesn't exist
CREATE TABLE IF NOT EXISTS leases (
    id SERIAL PRIMARY KEY,
    building_id INTEGER REFERENCES buildings(id),
    unit_id INTEGER REFERENCES units(id),
    leaseholder_name VARCHAR(255),
    start_date DATE,
    expiry_date DATE,
    rent_amount DECIMAL(10,2),
    service_charge DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Insert sample leases
INSERT INTO leases (building_id, unit_id, leaseholder_name, start_date, expiry_date, rent_amount, service_charge) VALUES
(1, 1, 'John Smith', '2020-01-01', '2030-01-01', 1800.00, 200.00),
(1, 2, 'Sarah Johnson', '2020-02-01', '2030-02-01', 1500.00, 180.00),
(1, 3, 'Michael Brown', '2020-03-01', '2030-03-01', 1900.00, 220.00),
(1, 4, 'Emma Davis', '2020-04-01', '2030-04-01', 1600.00, 190.00),
(1, 5, 'David Wilson', '2020-05-01', '2030-05-01', 2200.00, 250.00),
(1, 6, 'Lisa Anderson', '2020-06-01', '2030-06-01', 1850.00, 210.00),
(1, 7, 'Robert Taylor', '2020-07-01', '2030-07-01', 1550.00, 185.00),
(1, 8, 'Jennifer Martinez', '2020-08-01', '2030-08-01', 1950.00, 225.00),
(1, 9, 'Christopher Lee', '2020-09-01', '2030-09-01', 1650.00, 195.00),
(1, 10, 'Amanda Garcia', '2020-10-01', '2030-10-01', 2000.00, 230.00)
ON CONFLICT DO NOTHING;

-- 8. Create incoming_emails table if it doesn't exist
CREATE TABLE IF NOT EXISTS incoming_emails (
    id SERIAL PRIMARY KEY,
    building_id INTEGER REFERENCES buildings(id),
    unit VARCHAR(50),
    from_email VARCHAR(255),
    subject VARCHAR(500),
    body_preview TEXT,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    handled BOOLEAN DEFAULT FALSE
);

-- 9. Insert sample emails
INSERT INTO incoming_emails (building_id, unit, from_email, subject, body_preview, received_at) VALUES
(1, 'Flat 1', 'john.smith@email.com', 'Heating Issue in Flat 1', 'The heating system is not working properly in my flat. Can someone please check it?', NOW() - INTERVAL '2 days'),
(1, 'Flat 1', 'john.smith@email.com', 'Follow-up on Heating Issue', 'Thank you for the quick response. The heating is now working fine.', NOW() - INTERVAL '1 day'),
(1, 'Flat 2', 'sarah.johnson@email.com', 'Noise Complaint', 'There is excessive noise coming from the flat above. Can this be addressed?', NOW() - INTERVAL '3 days'),
(1, 'Flat 2', 'sarah.johnson@email.com', 'Noise Issue Resolved', 'The noise issue has been resolved. Thank you for your help.', NOW() - INTERVAL '1 day'),
(1, 'Flat 3', 'michael.brown@email.com', 'Maintenance Request', 'The kitchen tap is leaking. Please send a plumber.', NOW() - INTERVAL '4 days'),
(1, 'Flat 3', 'michael.brown@email.com', 'Tap Fixed', 'The tap has been fixed. Thank you for the prompt service.', NOW() - INTERVAL '2 days'),
(1, 'Flat 4', 'emma.davis@email.com', 'Parking Space Request', 'I would like to request a parking space for my vehicle.', NOW() - INTERVAL '5 days'),
(1, 'Flat 4', 'emma.davis@email.com', 'Parking Space Confirmed', 'Thank you for confirming the parking space allocation.', NOW() - INTERVAL '3 days'),
(1, 'Flat 5', 'david.wilson@email.com', 'Internet Connection Issue', 'The internet connection in my flat is very slow. Can this be investigated?', NOW() - INTERVAL '6 days'),
(1, 'Flat 5', 'david.wilson@email.com', 'Internet Fixed', 'The internet connection is now working properly. Thank you.', NOW() - INTERVAL '4 days'),
(1, 'Flat 6', 'lisa.anderson@email.com', 'Window Repair Needed', 'The window in my bedroom is not closing properly. Please arrange for repair.', NOW() - INTERVAL '7 days'),
(1, 'Flat 6', 'lisa.anderson@email.com', 'Window Repair Complete', 'The window has been repaired. Thank you for the quick response.', NOW() - INTERVAL '5 days'),
(1, 'Flat 7', 'robert.taylor@email.com', 'Electricity Problem', 'There is an electrical issue in my flat. The lights keep flickering.', NOW() - INTERVAL '8 days'),
(1, 'Flat 7', 'robert.taylor@email.com', 'Electrical Issue Resolved', 'The electrical issue has been fixed. Everything is working normally now.', NOW() - INTERVAL '6 days'),
(1, 'Flat 8', 'jennifer.martinez@email.com', 'Cleaning Service Request', 'I would like to request a cleaning service for my flat.', NOW() - INTERVAL '9 days'),
(1, 'Flat 8', 'jennifer.martinez@email.com', 'Cleaning Service Confirmed', 'Thank you for arranging the cleaning service. It was excellent.', NOW() - INTERVAL '7 days'),
(1, 'Flat 9', 'christopher.lee@email.com', 'Package Delivery Issue', 'I have a package that was delivered but I was not home. Can you help?', NOW() - INTERVAL '10 days'),
(1, 'Flat 9', 'christopher.lee@email.com', 'Package Collected', 'I have collected my package. Thank you for holding it for me.', NOW() - INTERVAL '8 days'),
(1, 'Flat 10', 'amanda.garcia@email.com', 'Security Concern', 'I noticed a security issue with the main entrance. Can this be addressed?', NOW() - INTERVAL '11 days'),
(1, 'Flat 10', 'amanda.garcia@email.com', 'Security Issue Resolved', 'The security issue has been resolved. Thank you for your attention to this matter.', NOW() - INTERVAL '9 days')
ON CONFLICT DO NOTHING;

-- 10. Create compliance_docs table if it doesn't exist
CREATE TABLE IF NOT EXISTS compliance_docs (
    id SERIAL PRIMARY KEY,
    building_id INTEGER REFERENCES buildings(id),
    doc_type VARCHAR(255),
    doc_url TEXT,
    summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Insert sample compliance documents
INSERT INTO compliance_docs (building_id, doc_type, doc_url, summary) VALUES
(1, 'Fire Safety Certificate', 'https://example.com/fire-safety.pdf', 'Annual fire safety inspection certificate'),
(1, 'Gas Safety Certificate', 'https://example.com/gas-safety.pdf', 'Annual gas safety inspection certificate'),
(1, 'Electrical Safety Certificate', 'https://example.com/electrical-safety.pdf', '5-year electrical safety inspection certificate'),
(1, 'Asbestos Survey', 'https://example.com/asbestos-survey.pdf', 'Asbestos survey report'),
(1, 'Energy Performance Certificate', 'https://example.com/epc.pdf', 'Energy Performance Certificate for the building')
ON CONFLICT DO NOTHING;

-- 12. Create property_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS property_events (
    id SERIAL PRIMARY KEY,
    building_id INTEGER REFERENCES buildings(id),
    title VARCHAR(255),
    description TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    event_type VARCHAR(100),
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Insert sample property events
INSERT INTO property_events (building_id, title, description, start_time, end_time, event_type, category) VALUES
(1, 'Annual General Meeting', 'RMC Annual General Meeting for all leaseholders', '2024-03-15 18:00:00', '2024-03-15 20:00:00', 'Meeting', 'RMC'),
(1, 'Fire Safety Inspection', 'Annual fire safety inspection by qualified inspector', '2024-03-20 09:00:00', '2024-03-20 17:00:00', 'Inspection', 'Compliance'),
(1, 'Window Replacement Project', 'Replacement of all windows in the building', '2024-04-01 08:00:00', '2024-04-30 17:00:00', 'Maintenance', 'Major Works'),
(1, 'Service Charge Review', 'Annual service charge review and budget planning', '2024-02-28 14:00:00', '2024-02-28 16:00:00', 'Meeting', 'Financial'),
(1, 'Building Insurance Renewal', 'Annual building insurance renewal process', '2024-01-15 10:00:00', '2024-01-15 12:00:00', 'Administrative', 'Insurance')
ON CONFLICT DO NOTHING;

-- 14. Create communications table
CREATE TABLE IF NOT EXISTS communications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  created_by uuid references profiles(id),
  type text check (type in ('email', 'letter', 'announcement')),
  subject text,
  content text,
  building_id uuid references buildings(id),
  unit_id uuid references units(id),
  template_id integer references communication_templates(id),
  send_method text default 'email' check (send_method in ('email', 'letter')),
  recipient_ids uuid[] default '{}',
  leaseholder_id uuid references leaseholders(id),
  sent boolean default false,
  sent_at timestamp
);

-- 15. Summary
SELECT 'Sample House Data Summary:' as info;
SELECT 'Buildings: ' || COUNT(*) as buildings_count FROM buildings;
SELECT 'Units: ' || COUNT(*) as units_count FROM units;
SELECT 'Leaseholders: ' || COUNT(*) as leaseholders_count FROM leaseholders;
SELECT 'Leases: ' || COUNT(*) as leases_count FROM leases;
SELECT 'Emails: ' || COUNT(*) as emails_count FROM incoming_emails;
SELECT 'Compliance Docs: ' || COUNT(*) as compliance_docs_count FROM compliance_docs;
SELECT 'Property Events: ' || COUNT(*) as events_count FROM property_events;
SELECT 'Communications: ' || COUNT(*) as communications_count FROM communications; 
