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

-- Create property_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS property_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
  created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
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
