-- Fix Compliance System Database Schema
-- This script fixes the "column building_compliance_assets.idasbca_id does not exist" error

BEGIN;

-- 1. Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create compliance_assets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.compliance_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  frequency_months integer,
  required_if text default 'always',
  default_frequency text default '1 year',
  priority text default 'medium',
  legal_requirement boolean default true,
  guidance_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Create building_compliance_assets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.building_compliance_assets (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references public.buildings(id) on delete cascade not null,
  compliance_asset_id uuid references public.compliance_assets(id) on delete cascade not null,
  last_renewed_date date,
  next_due_date date,
  status text check (status in ('compliant','pending','overdue','unknown')) default 'pending',
  status_override text,
  notes text,
  contractor text,
  last_completed_date date,
  frequency_months integer,
  assigned_to uuid references auth.users(id),
  contractor_id uuid,
  cost_estimate decimal(10,2),
  last_inspection_date date,
  next_inspection_date date,
  inspection_frequency text,
  risk_level text default 'medium',
  exemption_reason text,
  exemption_granted_by uuid references auth.users(id),
  exemption_granted_at timestamptz,
  reminder_days integer default 30,
  auto_reminders boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(building_id, compliance_asset_id)
);

-- 4. Create compliance_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.compliance_documents (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references public.buildings(id) on delete cascade not null,
  compliance_asset_id uuid references public.compliance_assets(id) on delete cascade not null,
  document_url text not null,
  title text,
  summary text,
  extracted_date date,
  doc_type text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Create building_documents table if it doesn't exist (for general building documents)
CREATE TABLE IF NOT EXISTS public.building_documents (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null,
  title text not null,
  storage_path text not null,
  mime_type text,
  doc_type text,
  summary text,
  ai_extracted jsonb,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. Create building_compliance_documents linking table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.building_compliance_documents (
  id uuid primary key default gen_random_uuid(),
  building_compliance_asset_id uuid not null references public.building_compliance_assets(id) on delete cascade,
  document_id uuid not null references public.building_documents(id) on delete cascade,
  created_at timestamptz default now(),
  unique(building_compliance_asset_id, document_id)
);

-- 7. Add missing columns to existing tables if they don't exist
DO $$ 
BEGIN
    -- Add columns to building_compliance_assets if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'building_compliance_assets' AND column_name = 'last_completed_date') THEN
        ALTER TABLE public.building_compliance_assets ADD COLUMN last_completed_date date;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'building_compliance_assets' AND column_name = 'frequency_months') THEN
        ALTER TABLE public.building_compliance_assets ADD COLUMN frequency_months integer;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'building_compliance_assets' AND column_name = 'assigned_to') THEN
        ALTER TABLE public.building_compliance_assets ADD COLUMN assigned_to uuid references auth.users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'building_compliance_assets' AND column_name = 'contractor_id') THEN
        ALTER TABLE public.building_compliance_assets ADD COLUMN contractor_id uuid;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'building_compliance_assets' AND column_name = 'cost_estimate') THEN
        ALTER TABLE public.building_compliance_assets ADD COLUMN cost_estimate decimal(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'building_compliance_assets' AND column_name = 'last_inspection_date') THEN
        ALTER TABLE public.building_compliance_assets ADD COLUMN last_inspection_date date;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'building_compliance_assets' AND column_name = 'next_inspection_date') THEN
        ALTER TABLE public.building_compliance_assets ADD COLUMN next_inspection_date date;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'building_compliance_assets' AND column_name = 'inspection_frequency') THEN
        ALTER TABLE public.building_compliance_assets ADD COLUMN inspection_frequency text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'building_compliance_assets' AND column_name = 'risk_level') THEN
        ALTER TABLE public.building_compliance_assets ADD COLUMN risk_level text default 'medium';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'building_compliance_assets' AND column_name = 'exemption_reason') THEN
        ALTER TABLE public.building_compliance_assets ADD COLUMN exemption_reason text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'building_compliance_assets' AND column_name = 'exemption_granted_by') THEN
        ALTER TABLE public.building_compliance_assets ADD COLUMN exemption_granted_by uuid references auth.users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'building_compliance_assets' AND column_name = 'exemption_granted_at') THEN
        ALTER TABLE public.building_compliance_assets ADD COLUMN exemption_granted_at timestamptz;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'building_compliance_assets' AND column_name = 'reminder_days') THEN
        ALTER TABLE public.building_compliance_assets ADD COLUMN reminder_days integer default 30;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'building_compliance_assets' AND column_name = 'auto_reminders') THEN
        ALTER TABLE public.building_compliance_assets ADD COLUMN auto_reminders boolean default true;
    END IF;
    
    -- Add columns to compliance_assets if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'compliance_assets' AND column_name = 'required_if') THEN
        ALTER TABLE public.compliance_assets ADD COLUMN required_if text default 'always';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'compliance_assets' AND column_name = 'default_frequency') THEN
        ALTER TABLE public.compliance_assets ADD COLUMN default_frequency text default '1 year';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'compliance_assets' AND column_name = 'priority') THEN
        ALTER TABLE public.compliance_assets ADD COLUMN priority text default 'medium';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'compliance_assets' AND column_name = 'legal_requirement') THEN
        ALTER TABLE public.compliance_assets ADD COLUMN legal_requirement boolean default true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'compliance_assets' AND column_name = 'guidance_notes') THEN
        ALTER TABLE public.compliance_assets ADD COLUMN guidance_notes text;
    END IF;
END $$;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS compliance_assets_category_idx ON public.compliance_assets(category);
CREATE INDEX IF NOT EXISTS building_compliance_assets_building_idx ON public.building_compliance_assets(building_id);
CREATE INDEX IF NOT EXISTS building_compliance_assets_status_idx ON public.building_compliance_assets(status);
CREATE INDEX IF NOT EXISTS building_compliance_assets_due_date_idx ON public.building_compliance_assets(next_due_date);
CREATE INDEX IF NOT EXISTS compliance_documents_building_idx ON public.compliance_documents(building_id);
CREATE INDEX IF NOT EXISTS compliance_documents_asset_idx ON public.compliance_documents(compliance_asset_id);
CREATE INDEX IF NOT EXISTS building_documents_building_idx ON public.building_documents(building_id);
CREATE INDEX IF NOT EXISTS building_compliance_documents_bca_idx ON public.building_compliance_documents(building_compliance_asset_id);
CREATE INDEX IF NOT EXISTS building_compliance_documents_doc_idx ON public.building_compliance_documents(document_id);

-- 9. Insert sample compliance assets if the table is empty
INSERT INTO public.compliance_assets (name, category, description, frequency_months, required_if, priority) 
SELECT * FROM (VALUES
  ('Fire Risk Assessment', 'Fire Safety', 'Assessment of fire risks in the building', 12, 'always', 'high'),
  ('Emergency Lighting Test', 'Fire Safety', 'Monthly test of emergency lighting systems', 1, 'always', 'medium'),
  ('Fire Alarm Test', 'Fire Safety', 'Weekly test of fire alarm system', 1, 'always', 'medium'),
  ('Lift Service', 'Lifts', 'Regular service and maintenance of lifts', 3, 'if present', 'medium'),
  ('Lift Insurance', 'Lifts', 'Annual insurance certificate for lifts', 12, 'if present', 'high'),
  ('Gas Safety Certificate', 'Gas Safety', 'Annual gas safety inspection', 12, 'if present', 'high'),
  ('Electrical Installation Condition Report', 'Electrical', 'EICR every 5 years', 60, 'always', 'high'),
  ('Portable Appliance Testing', 'Electrical', 'Annual PAT testing', 12, 'if present', 'medium'),
  ('Legionella Risk Assessment', 'Water Safety', 'Assessment of legionella risks', 24, 'always', 'high'),
  ('Water Tank Cleaning', 'Water Safety', 'Annual cleaning of water tanks', 12, 'if present', 'medium'),
  ('Asbestos Survey', 'Health & Safety', 'Management survey for asbestos', 120, 'always', 'high'),
  ('Health & Safety Risk Assessment', 'Health & Safety', 'General health and safety assessment', 12, 'always', 'high'),
  ('Insurance Certificate', 'Insurance', 'Buildings insurance certificate', 12, 'always', 'high'),
  ('Energy Performance Certificate', 'Energy', 'EPC certificate', 120, 'always', 'medium'),
  ('PAT Testing', 'Electrical', 'Portable appliance testing', 12, 'if present', 'medium')
) AS v(name, category, description, frequency_months, required_if, priority)
ON CONFLICT (name, category) DO NOTHING;

-- 10. Enable Row Level Security on all tables
ALTER TABLE public.compliance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_compliance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_compliance_documents ENABLE ROW LEVEL SECURITY;

-- 11. Create basic RLS policies (allow all for authenticated users)
CREATE POLICY "Allow all operations for authenticated users" ON public.compliance_assets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON public.building_compliance_assets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON public.compliance_documents FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON public.building_documents FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON public.building_compliance_documents FOR ALL USING (auth.role() = 'authenticated');

-- 12. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 13. Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_compliance_assets_updated_at ON public.compliance_assets;
CREATE TRIGGER update_compliance_assets_updated_at 
    BEFORE UPDATE ON public.compliance_assets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_building_compliance_assets_updated_at ON public.building_compliance_assets;
CREATE TRIGGER update_building_compliance_assets_updated_at 
    BEFORE UPDATE ON public.building_compliance_assets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_compliance_documents_updated_at ON public.compliance_documents;
CREATE TRIGGER update_compliance_documents_updated_at 
    BEFORE UPDATE ON public.compliance_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_building_documents_updated_at ON public.building_documents;
CREATE TRIGGER update_building_documents_updated_at 
    BEFORE UPDATE ON public.building_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- 14. Verify the schema
SELECT 
    'compliance_assets' as table_name,
    count(*) as row_count
FROM public.compliance_assets
UNION ALL
SELECT 
    'building_compliance_assets' as table_name,
    count(*) as row_count
FROM public.building_compliance_assets
UNION ALL
SELECT 
    'compliance_documents' as table_name,
    count(*) as row_count
FROM public.compliance_documents
UNION ALL
SELECT 
    'building_documents' as table_name,
    count(*) as row_count
FROM public.building_documents
UNION ALL
SELECT 
    'building_compliance_documents' as table_name,
    count(*) as row_count
FROM public.building_compliance_documents;

-- 15. Show the structure of building_compliance_assets table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'building_compliance_assets' 
AND table_schema = 'public'
ORDER BY ordinal_position;
