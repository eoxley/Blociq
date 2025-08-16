-- AI Building Queries Logging Table
-- Track all building-related AI queries for analytics and monitoring

create table if not exists public.ai_building_queries (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references public.buildings(id) on delete set null,
  unit_id uuid references public.units(id) on delete set null,
  leaseholder_id uuid references public.leaseholders(id) on delete set null,
  query_text text not null,
  response_text text,
  context_type text, -- 'building_info', 'unit_info', 'leaseholder_info', 'compliance', 'financial', etc.
  user_id uuid,
  session_id text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Indexes for analytics queries
create index if not exists ai_building_queries_building_idx on public.ai_building_queries(building_id);
create index if not exists ai_building_queries_unit_idx on public.ai_building_queries(unit_id);
create index if not exists ai_building_queries_leaseholder_idx on public.ai_building_queries(leaseholder_id);
create index if not exists ai_building_queries_context_type_idx on public.ai_building_queries(context_type);
create index if not exists ai_building_queries_created_idx on public.ai_building_queries(created_at);
create index if not exists ai_building_queries_user_idx on public.ai_building_queries(user_id);

-- Optional: Add RLS policies if needed
-- alter table public.ai_building_queries enable row level security;

-- Optional: Create a view for building query analytics
create or replace view public.vw_building_query_analytics as
select 
  b.name as building_name,
  b.id as building_id,
  count(*) as total_queries,
  count(distinct aq.user_id) as unique_users,
  count(distinct aq.session_id) as unique_sessions,
  array_agg(distinct aq.context_type) as context_types,
  min(aq.created_at) as first_query,
  max(aq.created_at) as last_query
from public.ai_building_queries aq
left join public.buildings b on b.id = aq.building_id
group by b.id, b.name
order by total_queries desc;
