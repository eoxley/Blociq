-- OCR MVP Schema Migration
-- BlocIQ OCR MVP – Drop-in Kit

create table documents (
  id uuid primary key default gen_random_uuid(),
  building_id uuid null,
  title text,
  file_path text not null,
  processing_status text not null default 'queued',
  confidence_avg numeric null,
  pages_total int null,
  pages_processed int null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table document_pages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  page_number int not null,
  text text null,
  confidence numeric null,
  ocr_engine text null,
  image_path text null,
  status text not null default 'pending'
);

create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  page_from int,
  page_to int,
  text text not null,
  confidence numeric,
  source text not null,
  created_at timestamptz default now()
);

create table document_processing_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  level text,
  message text,
  meta jsonb,
  created_at timestamptz default now()
);
