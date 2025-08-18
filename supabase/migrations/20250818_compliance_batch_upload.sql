begin;

-- Documents table (if you already have one, add missing cols only)
create table if not exists public.building_documents (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null,
  title text not null,
  storage_path text not null,
  mime_type text,
  doc_type text,                -- e.g. FRA, EICR, Legionella, Lift, etc.
  summary text,
  ai_extracted jsonb,           -- raw AI JSON (dates, provider, numbers)
  uploaded_by uuid,             -- auth.users.id
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Link table between building_compliance_assets and documents
create table if not exists public.building_compliance_documents (
  id uuid primary key default gen_random_uuid(),
  building_compliance_asset_id uuid not null,
  document_id uuid not null,
  created_at timestamptz default now()
);

-- Add useful columns to building_compliance_assets if missing
alter table public.building_compliance_assets
  add column if not exists last_completed_date date,
  add column if not exists next_due_date date,
  add column if not exists frequency_months integer,
  add column if not exists notes text;

-- Helpful indexes
create index if not exists idx_bdocs_building on public.building_documents(building_id);
create index if not exists idx_bc_docs_asset on public.building_compliance_documents(building_compliance_asset_id);

commit;
