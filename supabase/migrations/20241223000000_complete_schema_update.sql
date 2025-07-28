-- ========================================
-- COMPLETE SCHEMA UPDATE MIGRATION
-- Date: 2024-12-23
-- Description: Complete schema update to support all BlocIQ functionality
-- ========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- CREATE MISSING TABLES FIRST
-- ========================================

-- Create email_drafts table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id UUID,
  draft_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create building_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS building_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID,
  unit_id UUID,
  leaseholder_id UUID,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leases table if it doesn't exist
CREATE TABLE IF NOT EXISTS leases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID,
  unit_id UUID,
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

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  agency_id UUID,
  building_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  full_name VARCHAR(255),
  role VARCHAR(50),
  agency_id UUID,
  building_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agencies table if it doesn't exist
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  tone TEXT,
  policies TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create incoming_emails table if it doesn't exist
CREATE TABLE IF NOT EXISTS incoming_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID,
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  subject TEXT,
  body TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  handled BOOLEAN DEFAULT false,
  unread BOOLEAN DEFAULT true,
  thread_id VARCHAR(255),
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID,
  to_email VARCHAR(255) NOT NULL,
  subject TEXT,
  body TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  template_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create compliance_assets table if it doesn't exist
CREATE TABLE IF NOT EXISTS compliance_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  frequency_months INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create building_compliance_assets table if it doesn't exist
CREATE TABLE IF NOT EXISTS building_compliance_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID,
  asset_id UUID,
  status VARCHAR(50) DEFAULT 'pending',
  last_renewed_date DATE,
  next_due_date DATE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  latest_document_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create compliance_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS compliance_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID,
  compliance_asset_id UUID,
  document_url TEXT NOT NULL,
  document_type VARCHAR(100),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contractors table if it doesn't exist
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  services TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create compliance_contracts table if it doesn't exist
CREATE TABLE IF NOT EXISTS compliance_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID,
  compliance_asset_id UUID,
  contractor_id UUID,
  contract_start_date DATE,
  contract_end_date DATE,
  contract_value DECIMAL(10,2),
  contract_terms TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create occupiers table if it doesn't exist
CREATE TABLE IF NOT EXISTS occupiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  move_in_date DATE,
  move_out_date DATE,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create communications table if it doesn't exist
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID,
  unit_id UUID,
  leaseholder_id UUID,
  type VARCHAR(50),
  subject VARCHAR(255),
  content TEXT,
  created_by UUID,
  template_id UUID,
  send_method VARCHAR(50),
  recipient_ids UUID[],
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create communication_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS communication_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  subject VARCHAR(255),
  content TEXT,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create diary_entries table if it doesn't exist
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID,
  entry_text TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create property_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS property_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  event_type VARCHAR(100),
  category VARCHAR(100),
  outlook_event_id VARCHAR(255),
  location VARCHAR(255),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create major_works table if it doesn't exist
CREATE TABLE IF NOT EXISTS major_works (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID,
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

-- Create major_works_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS major_works_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  major_works_id UUID,
  log_date DATE,
  activity TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  building_id UUID,
  question TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  building_id UUID,
  message TEXT,
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create outlook_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS outlook_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create building_setup table if it doesn't exist
CREATE TABLE IF NOT EXISTS building_setup (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID,
  setup_step VARCHAR(100),
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_analysis table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID,
  analysis_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_queries table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  document_id UUID REFERENCES building_documents(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create building_amendments table if it doesn't exist
CREATE TABLE IF NOT EXISTS building_amendments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_type VARCHAR(50) NOT NULL,
  change_description TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- UPDATE BUILDINGS TABLE
-- ========================================

-- Add missing columns to buildings table
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS key_access_notes TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS entry_code VARCHAR(50);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS fire_panel_location VARCHAR(255);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS demo_ready BOOLEAN DEFAULT false;

-- Update buildings table to use UUID if not already
DO $$ 
BEGIN
    -- Check if buildings table uses SERIAL instead of UUID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'buildings' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        -- Convert SERIAL to UUID
        ALTER TABLE buildings ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE buildings ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- ========================================
-- UPDATE UNITS TABLE
-- ========================================

-- Update units table to use UUID if not already
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'units' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE units ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE units ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update building_id to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'units' 
        AND column_name = 'building_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE units ALTER COLUMN building_id TYPE UUID USING building_id::text::uuid;
    END IF;
END $$;

-- Add missing columns
ALTER TABLE units ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ========================================
-- UPDATE LEASEHOLDERS TABLE
-- ========================================

-- Update leaseholders table to use UUID if not already
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leaseholders' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE leaseholders ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE leaseholders ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update unit_id to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leaseholders' 
        AND column_name = 'unit_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE leaseholders ALTER COLUMN unit_id TYPE UUID USING unit_id::text::uuid;
    END IF;
END $$;

-- Add missing columns
ALTER TABLE leaseholders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ========================================
-- UPDATE COMPLIANCE TABLES
-- ========================================

-- Update compliance_assets table to use UUID if not already
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_assets' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE compliance_assets ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE compliance_assets ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Add missing columns to compliance_assets
ALTER TABLE compliance_assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update building_compliance_assets table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_compliance_assets' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE building_compliance_assets ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE building_compliance_assets ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Add missing columns to building_compliance_assets
ALTER TABLE building_compliance_assets ADD COLUMN IF NOT EXISTS asset_id UUID;
ALTER TABLE building_compliance_assets ADD COLUMN IF NOT EXISTS latest_document_id UUID;
ALTER TABLE building_compliance_assets ADD COLUMN IF NOT EXISTS last_renewed_date DATE;
ALTER TABLE building_compliance_assets ADD COLUMN IF NOT EXISTS next_due_date DATE;
ALTER TABLE building_compliance_assets ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE building_compliance_assets ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- Update building_id and asset_id to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_compliance_assets' 
        AND column_name = 'building_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE building_compliance_assets ALTER COLUMN building_id TYPE UUID USING building_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_compliance_assets' 
        AND column_name = 'asset_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE building_compliance_assets ALTER COLUMN asset_id TYPE UUID USING asset_id::text::uuid;
    END IF;
END $$;

-- Add missing columns
ALTER TABLE building_compliance_assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add UNIQUE constraint for building_id, asset_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'building_compliance_assets_building_id_asset_id_key' 
        AND conrelid = 'building_compliance_assets'::regclass
    ) THEN
        ALTER TABLE building_compliance_assets ADD CONSTRAINT building_compliance_assets_building_id_asset_id_key UNIQUE (building_id, asset_id);
    END IF;
END $$;

-- Fix data inconsistencies in building_compliance_assets status before adding constraint
UPDATE building_compliance_assets 
SET status = 'pending'
WHERE status IS NULL 
   OR status NOT IN ('pending', 'active', 'overdue', 'completed', 'expired');

-- Add CHECK constraint for status if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'building_compliance_assets_status_check' 
        AND conrelid = 'building_compliance_assets'::regclass
    ) THEN
        ALTER TABLE building_compliance_assets ADD CONSTRAINT building_compliance_assets_status_check 
            CHECK (status IN ('pending', 'active', 'overdue', 'completed', 'expired'));
    END IF;
END $$;

-- Update compliance_documents table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_documents' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE compliance_documents ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE compliance_documents ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update building_id and compliance_asset_id to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_documents' 
        AND column_name = 'building_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE compliance_documents ALTER COLUMN building_id TYPE UUID USING building_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_documents' 
        AND column_name = 'compliance_asset_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE compliance_documents ALTER COLUMN compliance_asset_id TYPE UUID USING compliance_asset_id::text::uuid;
    END IF;
END $$;

-- Add missing columns
ALTER TABLE compliance_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ========================================
-- UPDATE EMAIL TABLES
-- ========================================

-- Update incoming_emails table to use UUID if not already
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'incoming_emails' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE incoming_emails ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE incoming_emails ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update building_id, unit_id, leaseholder_id to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'incoming_emails' 
        AND column_name = 'building_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE incoming_emails ALTER COLUMN building_id TYPE UUID USING building_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'incoming_emails' 
        AND column_name = 'unit_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE incoming_emails ALTER COLUMN unit_id TYPE UUID USING unit_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'incoming_emails' 
        AND column_name = 'leaseholder_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE incoming_emails ALTER COLUMN leaseholder_id TYPE UUID USING leaseholder_id::text::uuid;
    END IF;
END $$;

-- Add missing columns
ALTER TABLE incoming_emails ADD COLUMN IF NOT EXISTS handled BOOLEAN DEFAULT false;
ALTER TABLE incoming_emails ADD COLUMN IF NOT EXISTS unread BOOLEAN DEFAULT true;
ALTER TABLE incoming_emails ADD COLUMN IF NOT EXISTS thread_id VARCHAR(255);
ALTER TABLE incoming_emails ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE incoming_emails ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update email_history table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_history' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE email_history ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE email_history ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update building_id and unit_id to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_history' 
        AND column_name = 'building_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE email_history ALTER COLUMN building_id TYPE UUID USING building_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_history' 
        AND column_name = 'unit_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE email_history ALTER COLUMN unit_id TYPE UUID USING unit_id::text::uuid;
    END IF;
END $$;

-- Update email_drafts table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_drafts' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE email_drafts ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE email_drafts ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update email_id to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_drafts' 
        AND column_name = 'email_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE email_drafts ALTER COLUMN email_id TYPE UUID USING email_id::text::uuid;
    END IF;
END $$;

-- Add missing columns
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ========================================
-- UPDATE DOCUMENT TABLES
-- ========================================

-- Update building_documents table to use UUID if not already
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_documents' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE building_documents ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE building_documents ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update building_id, unit_id, leaseholder_id to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_documents' 
        AND column_name = 'building_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE building_documents ALTER COLUMN building_id TYPE UUID USING building_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_documents' 
        AND column_name = 'unit_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE building_documents ALTER COLUMN unit_id TYPE UUID USING unit_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_documents' 
        AND column_name = 'leaseholder_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE building_documents ALTER COLUMN leaseholder_id TYPE UUID USING leaseholder_id::text::uuid;
    END IF;
END $$;

-- Add missing columns
ALTER TABLE building_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update leases table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leases' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE leases ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE leases ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update building_id and unit_id to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leases' 
        AND column_name = 'building_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE leases ALTER COLUMN building_id TYPE UUID USING building_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leases' 
        AND column_name = 'unit_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE leases ALTER COLUMN unit_id TYPE UUID USING unit_id::text::uuid;
    END IF;
END $$;

-- Add missing columns
ALTER TABLE leases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ========================================
-- UPDATE USER TABLES
-- ========================================

-- Update users table to use UUID if not already
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE users ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE users ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update building_id to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'building_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE users ALTER COLUMN building_id TYPE UUID USING building_id::text::uuid;
    END IF;
END $$;

-- Add missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update profiles table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE profiles ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE profiles ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update user_id and building_id to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'user_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE profiles ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'building_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE profiles ALTER COLUMN building_id TYPE UUID USING building_id::text::uuid;
    END IF;
END $$;

-- Add missing columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update agencies table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agencies' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE agencies ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE agencies ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Add missing columns
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ========================================
-- UPDATE OTHER TABLES
-- ========================================

-- Update contractors table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contractors' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE contractors ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE contractors ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Add missing columns
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update compliance_contracts table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_contracts' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE compliance_contracts ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE compliance_contracts ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update building_id, compliance_asset_id, contractor_id to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_contracts' 
        AND column_name = 'building_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE compliance_contracts ALTER COLUMN building_id TYPE UUID USING building_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_contracts' 
        AND column_name = 'compliance_asset_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE compliance_contracts ALTER COLUMN compliance_asset_id TYPE UUID USING compliance_asset_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compliance_contracts' 
        AND column_name = 'contractor_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE compliance_contracts ALTER COLUMN contractor_id TYPE UUID USING contractor_id::text::uuid;
    END IF;
END $$;

-- Add missing columns
ALTER TABLE compliance_contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update occupiers table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'occupiers' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE occupiers ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE occupiers ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update unit_id to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'occupiers' 
        AND column_name = 'unit_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE occupiers ALTER COLUMN unit_id TYPE UUID USING unit_id::text::uuid;
    END IF;
END $$;

-- Add missing columns
ALTER TABLE occupiers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ========================================
-- ADD MISSING TABLES
-- ========================================

-- Create building_setup table if it doesn't exist
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

-- Create document_analysis table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES building_documents(id) ON DELETE CASCADE,
  extracted_text TEXT,
  summary TEXT,
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_queries table if it doesn't exist
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
-- UPDATE NEWLY ADDED TABLES
-- ========================================

-- Update communications table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'communications' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE communications ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE communications ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update communications foreign keys to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'communications' 
        AND column_name = 'building_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE communications ALTER COLUMN building_id TYPE UUID USING building_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'communications' 
        AND column_name = 'unit_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE communications ALTER COLUMN unit_id TYPE UUID USING unit_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'communications' 
        AND column_name = 'leaseholder_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE communications ALTER COLUMN leaseholder_id TYPE UUID USING leaseholder_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'communications' 
        AND column_name = 'created_by' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE communications ALTER COLUMN created_by TYPE UUID USING created_by::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'communications' 
        AND column_name = 'template_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE communications ALTER COLUMN template_id TYPE UUID USING template_id::text::uuid;
    END IF;
END $$;

-- Add missing columns to communications
ALTER TABLE communications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update communication_templates table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'communication_templates' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE communication_templates ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE communication_templates ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Add missing columns to communication_templates
ALTER TABLE communication_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update diary_entries table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'diary_entries' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE diary_entries ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE diary_entries ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Add missing columns to diary_entries
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update property_events table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'property_events' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE property_events ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE property_events ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update property_events foreign keys to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'property_events' 
        AND column_name = 'building_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE property_events ALTER COLUMN building_id TYPE UUID USING building_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'property_events' 
        AND column_name = 'unit_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE property_events ALTER COLUMN unit_id TYPE UUID USING unit_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'property_events' 
        AND column_name = 'leaseholder_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE property_events ALTER COLUMN leaseholder_id TYPE UUID USING leaseholder_id::text::uuid;
    END IF;
END $$;

-- Add missing columns to property_events
ALTER TABLE property_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update major_works table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'major_works' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE major_works ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE major_works ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update major_works foreign keys to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'major_works' 
        AND column_name = 'building_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE major_works ALTER COLUMN building_id TYPE UUID USING building_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'major_works' 
        AND column_name = 'contractor_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE major_works ALTER COLUMN contractor_id TYPE UUID USING contractor_id::text::uuid;
    END IF;
END $$;

-- Add missing columns to major_works
ALTER TABLE major_works ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update major_works_logs table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'major_works_logs' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE major_works_logs ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE major_works_logs ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update major_works_logs foreign keys to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'major_works_logs' 
        AND column_name = 'major_work_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE major_works_logs ALTER COLUMN major_work_id TYPE UUID USING major_work_id::text::uuid;
    END IF;
END $$;

-- Add missing columns to major_works_logs
ALTER TABLE major_works_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update ai_logs table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_logs' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE ai_logs ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE ai_logs ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Add missing columns to ai_logs
ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update chat_history table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_history' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE chat_history ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE chat_history ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update chat_history foreign keys to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_history' 
        AND column_name = 'user_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE chat_history ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_history' 
        AND column_name = 'building_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE chat_history ALTER COLUMN building_id TYPE UUID USING building_id::text::uuid;
    END IF;
END $$;

-- Add missing columns to chat_history
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update outlook_tokens table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'outlook_tokens' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE outlook_tokens ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE outlook_tokens ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update outlook_tokens foreign keys to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'outlook_tokens' 
        AND column_name = 'user_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE outlook_tokens ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;
    END IF;
END $$;

-- Add missing columns to outlook_tokens
ALTER TABLE outlook_tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update building_setup table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_setup' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE building_setup ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE building_setup ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update building_setup foreign keys to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_setup' 
        AND column_name = 'building_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE building_setup ALTER COLUMN building_id TYPE UUID USING building_id::text::uuid;
    END IF;
END $$;

-- Add missing columns to building_setup
ALTER TABLE building_setup ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update document_analysis table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_analysis' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE document_analysis ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE document_analysis ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update document_analysis foreign keys to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_analysis' 
        AND column_name = 'document_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE document_analysis ALTER COLUMN document_id TYPE UUID USING document_id::text::uuid;
    END IF;
END $$;

-- Add missing columns to document_analysis
ALTER TABLE document_analysis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update document_queries table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_queries' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE document_queries ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE document_queries ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update document_queries foreign keys to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_queries' 
        AND column_name = 'user_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE document_queries ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_queries' 
        AND column_name = 'building_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE document_queries ALTER COLUMN building_id TYPE UUID USING building_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_queries' 
        AND column_name = 'document_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE document_queries ALTER COLUMN document_id TYPE UUID USING document_id::text::uuid;
    END IF;
END $$;

-- Add missing columns to document_queries
ALTER TABLE document_queries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update building_amendments table
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_amendments' 
        AND column_name = 'id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE building_amendments ALTER COLUMN id TYPE UUID USING uuid_generate_v4();
        ALTER TABLE building_amendments ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Update building_amendments foreign keys to UUID if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_amendments' 
        AND column_name = 'building_id' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE building_amendments ALTER COLUMN building_id TYPE UUID USING building_id::text::uuid;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_amendments' 
        AND column_name = 'created_by' 
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE building_amendments ALTER COLUMN created_by TYPE UUID USING created_by::text::uuid;
    END IF;
END $$;

-- Add missing columns to building_amendments
ALTER TABLE building_amendments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ========================================
-- ADD MISSING FOREIGN KEY CONSTRAINTS
-- ========================================

-- Add missing foreign keys for email management (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'incoming_emails_user_id_fkey' 
        AND table_name = 'incoming_emails'
    ) THEN
        ALTER TABLE incoming_emails ADD CONSTRAINT incoming_emails_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'leases_uploaded_by_fkey' 
        AND table_name = 'leases'
    ) THEN
        ALTER TABLE leases ADD CONSTRAINT leases_uploaded_by_fkey 
          FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'leases_user_id_fkey' 
        AND table_name = 'leases'
    ) THEN
        ALTER TABLE leases ADD CONSTRAINT leases_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'communications_template_id_fkey' 
        AND table_name = 'communications'
    ) THEN
        ALTER TABLE communications ADD CONSTRAINT communications_template_id_fkey 
          FOREIGN KEY (template_id) REFERENCES communication_templates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ========================================
-- ADD MISSING INDEXES
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

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_agency_id ON users(agency_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- ========================================
-- ADD TRIGGERS FOR UPDATED_AT
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
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_buildings_updated_at'
    ) THEN
        CREATE TRIGGER update_buildings_updated_at 
            BEFORE UPDATE ON buildings 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_building_setup_updated_at'
    ) THEN
        CREATE TRIGGER update_building_setup_updated_at 
            BEFORE UPDATE ON building_setup 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_units_updated_at'
    ) THEN
        CREATE TRIGGER update_units_updated_at 
            BEFORE UPDATE ON units 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_leaseholders_updated_at'
    ) THEN
        CREATE TRIGGER update_leaseholders_updated_at 
            BEFORE UPDATE ON leaseholders 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_compliance_assets_updated_at'
    ) THEN
        CREATE TRIGGER update_compliance_assets_updated_at 
            BEFORE UPDATE ON compliance_assets 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_building_compliance_assets_updated_at'
    ) THEN
        CREATE TRIGGER update_building_compliance_assets_updated_at 
            BEFORE UPDATE ON building_compliance_assets 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_compliance_documents_updated_at'
    ) THEN
        CREATE TRIGGER update_compliance_documents_updated_at 
            BEFORE UPDATE ON compliance_documents 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_incoming_emails_updated_at'
    ) THEN
        CREATE TRIGGER update_incoming_emails_updated_at 
            BEFORE UPDATE ON incoming_emails 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_email_drafts_updated_at'
    ) THEN
        CREATE TRIGGER update_email_drafts_updated_at 
            BEFORE UPDATE ON email_drafts 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_building_documents_updated_at'
    ) THEN
        CREATE TRIGGER update_building_documents_updated_at 
            BEFORE UPDATE ON building_documents 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_leases_updated_at'
    ) THEN
        CREATE TRIGGER update_leases_updated_at 
            BEFORE UPDATE ON leases 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_users_updated_at'
    ) THEN
        CREATE TRIGGER update_users_updated_at 
            BEFORE UPDATE ON users 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_profiles_updated_at'
    ) THEN
        CREATE TRIGGER update_profiles_updated_at 
            BEFORE UPDATE ON profiles 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_agencies_updated_at'
    ) THEN
        CREATE TRIGGER update_agencies_updated_at 
            BEFORE UPDATE ON agencies 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ========================================
-- ENABLE ROW LEVEL SECURITY
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
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE occupiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_amendments ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ADD SAMPLE DATA
-- ========================================

-- Insert sample compliance assets if they don't exist
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

-- Insert sample contractors if they don't exist
INSERT INTO contractors (name, email, phone, notes) VALUES
('ABC Fire Safety Ltd', 'john@abcfire.co.uk', '020 1234 5678', 'Fire safety specialists'),
('Gas Safe Engineers Ltd', 'sarah@gassafe.co.uk', '020 2345 6789', 'Gas safety certified'),
('Electrical Safety First', 'mike@electricalsafety.co.uk', '020 3456 7890', 'Electrical safety experts'),
('Lift Maintenance Co', 'emma@liftmaintenance.co.uk', '020 4567 8901', 'Lift maintenance specialists'),
('Water Safety Solutions', 'david@watersafety.co.uk', '020 5678 9012', 'Water safety and legionella specialists')
ON CONFLICT DO NOTHING; 