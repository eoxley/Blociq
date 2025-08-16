-- Optional: log what gets generated (so you can improve copy)
create table if not exists public.works_orders (
  id uuid primary key default gen_random_uuid(),
  building_id uuid,
  created_by uuid,
  source text, -- chat | inbox
  trade_hint text,
  contractor_email text,
  subject text,
  body text,
  created_at timestamptz default now()
);

-- Index for querying by building
create index if not exists works_orders_building_idx on public.works_orders(building_id);
create index if not exists works_orders_created_by_idx on public.works_orders(created_by);
create index if not exists works_orders_created_at_idx on public.works_orders(created_at desc);
