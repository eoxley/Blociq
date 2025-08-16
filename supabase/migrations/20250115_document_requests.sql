-- Document Requests Logging (Optional)
-- Track document requests for analytics and monitoring

create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(),
  building_id uuid,
  doc_type text,
  source text, -- chat | inbox_triage
  requested_by uuid,
  resolved boolean default false,
  doc_id uuid,
  created_at timestamptz default now()
);

-- Index for analytics queries
create index if not exists document_requests_building_idx on public.document_requests(building_id);
create index if not exists document_requests_doc_type_idx on public.document_requests(doc_type);
create index if not exists document_requests_created_idx on public.document_requests(created_at);
