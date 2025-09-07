-- Create communications views for mail-merge system
-- These views provide fast, RLS-safe access to recipient data

-- Canonical recipient view for mail-merge
create or replace view public.v_building_recipients as
select
  b.agency_id,
  b.id            as building_id,
  b.name          as building_name,
  u.id            as unit_id,
  u.unit_label    as unit_label,               -- "Flat 8"
  l.id            as lease_id,
  lh.id           as leaseholder_id,
  -- Names & salutations
  lh.salutation   as salutation,               -- "Mr & Mrs Smith" (fallback below)
  coalesce(nullif(lh.salutation,''), 
           case when position('&' in string_agg(lh.full_name, ' & '))>0
                then string_agg(lh.full_name, ' & ')
                else string_agg(lh.full_name, ', ')
           end) over (partition by l.id) as salutation_fallback,
  -- Correspondence address (prefer correspondence, fallback to unit postal)
  coalesce(lh.correspondence_address, u.postal_address) as postal_address,
  -- Email preferences (dedupe/suppress later in app)
  lower(lh.email) as email,
  lh.opt_out_email as opt_out_email,
  -- Common merge fields
  to_char(now() at time zone 'Europe/London','DD/MM/YYYY') as today,
  b.address_line_1, b.town, b.postcode,
  l.service_charge_percent, l.lease_start_date, l.lease_end_date,
  -- Useful flags
  (case when lh.correspondence_address is null then true else false end) as uses_unit_as_postal,
  -- Additional fields for merge
  lh.full_name as leaseholder_name,
  u.unit_number,
  u.unit_type,
  b.address_line_2,
  b.county,
  l.rent_amount,
  l.deposit_amount,
  l.lease_type,
  l.break_clause_date,
  l.renewal_date,
  l.insurance_required,
  l.pet_clause,
  l.subletting_allowed,
  -- Timestamps
  l.created_at as lease_created_at,
  l.updated_at as lease_updated_at,
  lh.created_at as leaseholder_created_at,
  lh.updated_at as leaseholder_updated_at
from buildings b
join units u                    on u.building_id = b.id
join leases l                   on l.unit_id = u.id and l.is_active = true
join lease_leaseholders ll      on ll.lease_id = l.id and ll.is_active = true
join leaseholders lh            on lh.id = ll.leaseholder_id
where b.is_deleted = false
  and u.is_deleted = false
  and lh.is_deleted = false;

-- Communications log table (if not exists)
create table if not exists public.communications_log (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id),
  building_id uuid not null references buildings(id),
  unit_id uuid references units(id),
  lease_id uuid references leases(id),
  leaseholder_id uuid references leaseholders(id),
  type text not null check (type in ('letter', 'email')),
  status text not null check (status in ('generated', 'queued', 'sent', 'failed', 'delivered', 'bounced')),
  template_id uuid references communication_templates(id),
  storage_path text,
  message_id text,
  subject text,
  recipient_email text,
  recipient_address text,
  metadata jsonb default '{}',
  created_at timestamp with time zone default now(),
  created_by uuid references auth.users(id),
  updated_at timestamp with time zone default now()
);

-- Communication templates table (if not exists)
create table if not exists public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id),
  name text not null,
  description text,
  type text not null check (type in ('letter', 'email')),
  subject text, -- For emails
  body_html text not null,
  body_text text,
  required_fields text[] default '{}',
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  created_by uuid references auth.users(id),
  updated_at timestamp with time zone default now()
);

-- Create indexes for performance
create index if not exists idx_v_building_recipients_agency_building 
  on public.v_building_recipients (agency_id, building_id);

create index if not exists idx_v_building_recipients_email 
  on public.v_building_recipients (email) 
  where email is not null and email != '';

create index if not exists idx_communications_log_agency_building 
  on public.communications_log (agency_id, building_id, created_at desc);

create index if not exists idx_communications_log_type_status 
  on public.communications_log (type, status, created_at desc);

create index if not exists idx_communication_templates_agency_type 
  on public.communication_templates (agency_id, type, is_active);

-- RLS policies
alter table public.communications_log enable row level security;
alter table public.communication_templates enable row level security;

-- RLS policy for communications_log
create policy "Users can view communications_log for their agency" on public.communications_log
  for select using (agency_id = (select agency_id from profiles where id = auth.uid()));

create policy "Users can insert communications_log for their agency" on public.communications_log
  for insert with check (agency_id = (select agency_id from profiles where id = auth.uid()));

create policy "Users can update communications_log for their agency" on public.communications_log
  for update using (agency_id = (select agency_id from profiles where id = auth.uid()));

-- RLS policy for communication_templates
create policy "Users can view communication_templates for their agency" on public.communication_templates
  for select using (agency_id = (select agency_id from profiles where id = auth.uid()));

create policy "Users can insert communication_templates for their agency" on public.communication_templates
  for insert with check (agency_id = (select agency_id from profiles where id = auth.uid()));

create policy "Users can update communication_templates for their agency" on public.communication_templates
  for update using (agency_id = (select agency_id from profiles where id = auth.uid()));

-- RLS policy for v_building_recipients view
create policy "Users can view v_building_recipients for their agency" on public.v_building_recipients
  for select using (agency_id = (select agency_id from profiles where id = auth.uid()));

-- Grant permissions
grant select on public.v_building_recipients to authenticated;
grant select, insert, update on public.communications_log to authenticated;
grant select, insert, update on public.communication_templates to authenticated;

-- Add comments for documentation
comment on view public.v_building_recipients is 'Canonical recipient view for mail-merge with all merge fields precomputed';
comment on table public.communications_log is 'Audit log for all communications sent via mail-merge system';
comment on table public.communication_templates is 'Templates for letters and emails with merge field support';
