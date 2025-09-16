-- Create communication_templates table for storing email and letter templates
create table communication_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type text check (type in ('email', 'letter')) not null,
  category text default 'general',
  subject text,
  body text not null,
  placeholders text[] default array[]::text[],
  is_active boolean default true,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add indexes for better query performance
create index communication_templates_type_idx on communication_templates(type);
create index communication_templates_category_idx on communication_templates(category);
create index communication_templates_active_idx on communication_templates(is_active);
create index communication_templates_created_by_idx on communication_templates(created_by);

-- Add RLS policies
alter table communication_templates enable row level security;

-- Policy for authenticated users to see active templates
create policy "Users can view active templates" on communication_templates
  for select using (auth.role() = 'authenticated' and is_active = true);

-- Policy for authenticated users to create templates
create policy "Users can create templates" on communication_templates
  for insert with check (auth.role() = 'authenticated' and created_by = auth.uid());

-- Policy for users to update their own templates
create policy "Users can update own templates" on communication_templates
  for update using (auth.role() = 'authenticated' and created_by = auth.uid());

-- Policy for service role to manage all templates
create policy "Service role can manage all templates" on communication_templates
  for all using (auth.jwt() ->> 'role' = 'service_role');

-- Create updated_at trigger
create or replace function update_communication_templates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger communication_templates_updated_at
  before update on communication_templates
  for each row execute function update_communication_templates_updated_at();