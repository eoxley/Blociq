-- Compliance Tracking Tables
-- Master list of compliance assets and building-specific tracking

-- Master list of compliance assets
create table if not exists public.compliance_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  frequency_months integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Building-specific compliance tracking
create table if not exists public.building_compliance_assets (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references public.buildings(id) on delete cascade not null,
  compliance_asset_id uuid references public.compliance_assets(id) on delete cascade not null,
  last_renewed_date date,
  next_due_date date,
  status text check (status in ('compliant','pending','overdue','unknown')) default 'pending',
  status_override text, -- manual override of calculated status
  notes text,
  contractor text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(building_id, compliance_asset_id)
);

-- Indexes for performance
create index if not exists compliance_assets_category_idx on public.compliance_assets(category);
create index if not exists building_compliance_assets_building_idx on public.building_compliance_assets(building_id);
create index if not exists building_compliance_assets_status_idx on public.building_compliance_assets(status);
create index if not exists building_compliance_assets_due_date_idx on public.building_compliance_assets(next_due_date);

-- Insert some sample compliance assets
insert into public.compliance_assets (name, category, description, frequency_months) values
  ('Fire Risk Assessment', 'Fire Safety', 'Assessment of fire risks in the building', 12),
  ('Emergency Lighting Test', 'Fire Safety', 'Monthly test of emergency lighting systems', 1),
  ('Fire Alarm Test', 'Fire Safety', 'Weekly test of fire alarm system', 1),
  ('Lift Service', 'Lifts', 'Regular service and maintenance of lifts', 3),
  ('Lift Insurance', 'Lifts', 'Annual insurance certificate for lifts', 12),
  ('Gas Safety Certificate', 'Gas Safety', 'Annual gas safety inspection', 12),
  ('Electrical Installation Condition Report', 'Electrical', 'EICR every 5 years', 60),
  ('Portable Appliance Testing', 'Electrical', 'Annual PAT testing', 12),
  ('Legionella Risk Assessment', 'Water Safety', 'Assessment of legionella risks', 24),
  ('Water Tank Cleaning', 'Water Safety', 'Annual cleaning of water tanks', 12),
  ('Asbestos Survey', 'Health & Safety', 'Management survey for asbestos', 120),
  ('Health & Safety Risk Assessment', 'Health & Safety', 'General health and safety assessment', 12),
  ('Insurance Certificate', 'Insurance', 'Buildings insurance certificate', 12),
  ('Energy Performance Certificate', 'Energy', 'EPC certificate', 120),
  ('PAT Testing', 'Electrical', 'Portable appliance testing', 12)
on conflict do nothing;
