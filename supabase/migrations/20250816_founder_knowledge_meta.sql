-- Add helpful metadata (all additive / IF NOT EXISTS)
alter table public.founder_knowledge
  add column if not exists tags text[] default '{}',
  add column if not exists contexts text[] default '{}',     -- e.g. {core, complaints, doc_summary, auto_polish}
  add column if not exists priority int default 0,
  add column if not exists version int default 1,
  add column if not exists effective_from date default now(),
  add column if not exists expires_on date,
  add column if not exists review_due date,
  add column if not exists is_active boolean default true,
  add column if not exists source_url text,
  add column if not exists last_validated_by text;

-- Simple indexes to help selection
create index if not exists founder_knowledge_active_idx on public.founder_knowledge(is_active);
create index if not exists founder_knowledge_priority_idx on public.founder_knowledge(priority desc);
