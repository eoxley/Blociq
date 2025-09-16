-- Create communications_log table for storing all inbound and outbound emails
create table communications_log (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) on delete set null,
  leaseholder_id uuid references leaseholders(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  direction text check (direction in ('inbound', 'outbound')) not null,
  subject text,
  body text,
  metadata jsonb default '{}'::jsonb,
  sent_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Add indexes for better query performance
create index communications_log_building_id_idx on communications_log(building_id);
create index communications_log_leaseholder_id_idx on communications_log(leaseholder_id);
create index communications_log_direction_idx on communications_log(direction);
create index communications_log_sent_at_idx on communications_log(sent_at);

-- Add RLS policies
alter table communications_log enable row level security;

-- Policy for authenticated users to see all communications
create policy "Users can view all communications" on communications_log
  for select using (auth.role() = 'authenticated');

-- Policy for authenticated users to insert communications
create policy "Users can insert communications" on communications_log
  for insert with check (auth.role() = 'authenticated');

-- Policy for service role to manage all communications
create policy "Service role can manage communications" on communications_log
  for all using (auth.jwt() ->> 'role' = 'service_role');