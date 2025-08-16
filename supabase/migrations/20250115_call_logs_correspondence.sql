-- Call Logs and Correspondence Tables
-- For tracking communication history

-- Call logs table
create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references public.buildings(id) on delete cascade,
  unit_id uuid references public.units(id) on delete cascade,
  leaseholder_id uuid references public.leaseholders(id) on delete cascade,
  call_type text check (call_type in ('incoming','outgoing','missed')) not null,
  duration_minutes integer,
  notes text,
  follow_up_required boolean default false,
  follow_up_date date,
  logged_by uuid, -- user who logged the call
  logged_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Correspondence table
create table if not exists public.correspondence (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references public.buildings(id) on delete cascade,
  unit_id uuid references public.units(id) on delete cascade,
  leaseholder_id uuid references public.leaseholders(id) on delete cascade,
  type text check (type in ('email','letter','sms','other')) not null,
  subject text,
  content text,
  direction text check (direction in ('incoming','outgoing')) not null,
  sent_at timestamptz,
  received_at timestamptz,
  status text check (status in ('sent','delivered','read','failed')) default 'sent',
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists call_logs_building_idx on public.call_logs(building_id);
create index if not exists call_logs_unit_idx on public.call_logs(unit_id);
create index if not exists call_logs_leaseholder_idx on public.call_logs(leaseholder_id);
create index if not exists call_logs_logged_at_idx on public.call_logs(logged_at);

create index if not exists correspondence_building_idx on public.correspondence(building_id);
create index if not exists correspondence_unit_idx on public.correspondence(unit_id);
create index if not exists correspondence_leaseholder_idx on public.correspondence(leaseholder_id);
create index if not exists correspondence_created_idx on public.correspondence(created_at);
