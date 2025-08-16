-- Compliance Documents Linking Table
-- Links building compliance assets to uploaded documents

create table if not exists public.building_compliance_documents (
  id uuid primary key default gen_random_uuid(),
  building_compliance_asset_id uuid not null references public.building_compliance_assets(id) on delete cascade,
  document_id uuid not null references public.building_documents(id) on delete cascade,
  created_at timestamptz default now(),
  unique(building_compliance_asset_id, document_id)
);

-- Index for performance
create index if not exists building_compliance_documents_bca_idx on public.building_compliance_documents(building_compliance_asset_id);
create index if not exists building_compliance_documents_doc_idx on public.building_compliance_documents(document_id);
