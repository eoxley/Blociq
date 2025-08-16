-- ===== Major Works =====
create table if not exists public.major_works_projects (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  title text not null,
  stage text not null default 'planning',         -- planning | s20_precons | tender | in_progress | complete | on_hold
  s20_required boolean default false,
  s20_stage text,                                 -- pre-consultation | notice of intention | notice of estimates | award
  budget_estimate numeric(12,2),
  next_milestone text,
  next_milestone_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.major_works_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.major_works_projects(id) on delete cascade,
  label text not null,
  due_date date,
  done boolean default false,
  created_at timestamptz default now()
);

-- Optional link to docs already stored in building_documents
create table if not exists public.major_works_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.major_works_projects(id) on delete cascade,
  document_id uuid not null references public.building_documents(id) on delete cascade,
  created_at timestamptz default now()
);

-- ===== Compliance Portfolio Views =====
-- Create the base building compliance view first
create or replace view public.vw_building_compliance as
select
  bca.id as bca_id,
  bca.building_id,
  ca.id as asset_id,
  ca.title as asset_name,
  ca.category,
  bca.due_date as next_due_date,
  bca.due_date as last_renewed_date,
  case
    when bca.due_date is null then 'unknown'
    when bca.due_date < current_date then 'overdue'
    when bca.due_date <= current_date + interval '30 days' then 'due_soon'
    when bca.due_date is not null then 'compliant'
    else 'pending'
  end as status
from public.building_compliance_assets bca
join public.compliance_assets ca on ca.id = bca.compliance_asset_id;

-- Portfolio compliance counts view
create or replace view public.vw_portfolio_compliance_counts as
select
  b.name as building_name,
  v.building_id,
  count(*) as total,
  count(*) filter (where v.status = 'compliant') as compliant,
  count(*) filter (where v.status = 'due_soon') as due_soon,
  count(*) filter (where v.status = 'overdue') as overdue,
  count(*) filter (where v.status = 'missing') as missing
from public.vw_building_compliance v
join public.buildings b on b.id = v.building_id
group by b.name, v.building_id
order by b.name;

create or replace view public.vw_portfolio_compliance_upcoming as
select
  b.name as building_name,
  v.building_id,
  v.asset_name,
  v.category,
  v.bca_id,
  v.next_due_date,
  v.status
from public.vw_building_compliance v
join public.buildings b on b.id = v.building_id
where v.next_due_date is not null
  and v.next_due_date <= current_date + interval '90 days'
order by v.next_due_date asc, b.name, v.asset_name;
