-- Create reporting views for Ask BlocIQ
-- These views provide fast, RLS-safe access to reporting data

-- Building compliance status view
create or replace view public.building_compliance_status_v as
select
  bca.building_id,
  bca.asset_type as asset_key,
  bca.status,
  bca.last_inspected_at,
  bca.next_due_date,
  case 
    when bca.next_due_date < now() then 
      extract(days from now() - bca.next_due_date)::integer
    else 0
  end as days_overdue,
  case 
    when bca.next_due_date >= now() then 
      extract(days from bca.next_due_date - now())::integer
    else 0
  end as days_until_due,
  bca.updated_at,
  bca.created_at
from public.building_compliance_assets bca
where bca.is_deleted = false;

-- Compliance overdue view
create or replace view public.compliance_overdue_v as
select
  bca.building_id,
  bca.asset_type as asset_key,
  bca.status,
  bca.last_inspected_at,
  bca.next_due_date,
  extract(days from now() - bca.next_due_date)::integer as days_overdue,
  case 
    when extract(days from now() - bca.next_due_date) > 180 then 'Critical'
    when extract(days from now() - bca.next_due_date) > 90 then 'High'
    when extract(days from now() - bca.next_due_date) > 30 then 'Medium'
    else 'Low'
  end as severity,
  bca.updated_at
from public.building_compliance_assets bca
where bca.is_deleted = false
  and bca.next_due_date < now()
  and bca.status != 'exempt';

-- Compliance upcoming view (next 90 days)
create or replace view public.compliance_upcoming_v as
select
  bca.building_id,
  bca.asset_type as asset_key,
  bca.status,
  bca.last_inspected_at,
  bca.next_due_date,
  extract(days from bca.next_due_date - now())::integer as days_until_due,
  case 
    when extract(days from bca.next_due_date - now()) <= 30 then 'Urgent'
    when extract(days from bca.next_due_date - now()) <= 60 then 'Soon'
    else 'Upcoming'
  end as priority,
  bca.updated_at
from public.building_compliance_assets bca
where bca.is_deleted = false
  and bca.next_due_date >= now()
  and bca.next_due_date <= now() + interval '90 days'
  and bca.status != 'exempt';

-- Buildings minimal view
create or replace view public.buildings_min_v as
select
  b.id as building_id,
  b.name as building_name,
  b.address,
  b.is_hrb,
  b.agency_id,
  b.created_at,
  b.updated_at
from public.buildings b
where b.is_deleted = false;

-- Units minimal view
create or replace view public.units_min_v as
select
  u.id as unit_id,
  u.building_id,
  u.unit_number,
  u.unit_name,
  u.unit_type,
  u.is_active,
  u.created_at,
  u.updated_at
from public.units u
where u.is_deleted = false;

-- Document types summary view
create or replace view public.document_types_summary_v as
select
  bd.building_id,
  bd.doc_type,
  count(*) as total_documents,
  max(coalesce(bd.doc_date, bd.created_at)) as latest_document_date,
  min(coalesce(bd.doc_date, bd.created_at)) as earliest_document_date,
  array_agg(distinct bd.filename order by bd.filename) as filenames
from public.building_documents bd
where bd.is_deleted = false
group by bd.building_id, bd.doc_type;

-- Compliance by type view
create or replace view public.compliance_by_type_v as
select
  bca.building_id,
  bca.asset_type,
  bca.status,
  bca.last_inspected_at,
  bca.next_due_date,
  bca.summary_json,
  case 
    when bca.next_due_date < now() then 
      extract(days from now() - bca.next_due_date)::integer
    else 0
  end as days_overdue,
  case 
    when bca.next_due_date >= now() then 
      extract(days from bca.next_due_date - now())::integer
    else 0
  end as days_until_due,
  bca.updated_at
from public.building_compliance_assets bca
where bca.is_deleted = false;

-- Grant access to authenticated users
grant select on public.building_compliance_status_v to authenticated;
grant select on public.compliance_overdue_v to authenticated;
grant select on public.compliance_upcoming_v to authenticated;
grant select on public.buildings_min_v to authenticated;
grant select on public.units_min_v to authenticated;
grant select on public.document_types_summary_v to authenticated;
grant select on public.compliance_by_type_v to authenticated;

-- Create indexes for better performance
create index if not exists idx_building_compliance_status_building_asset 
  on public.building_compliance_assets (building_id, asset_type, next_due_date);

create index if not exists idx_building_compliance_status_due_date 
  on public.building_compliance_assets (next_due_date) 
  where is_deleted = false;

create index if not exists idx_building_documents_building_type_date 
  on public.building_documents (building_id, doc_type, coalesce(doc_date, created_at) desc)
  where is_deleted = false;

create index if not exists idx_buildings_agency_hrb 
  on public.buildings (agency_id, is_hrb) 
  where is_deleted = false;

-- Add comments for documentation
comment on view public.building_compliance_status_v is 'Current compliance status for all building assets';
comment on view public.compliance_overdue_v is 'Assets that are overdue for inspection or renewal';
comment on view public.compliance_upcoming_v is 'Assets due for inspection or renewal in the next 90 days';
comment on view public.buildings_min_v is 'Minimal building information for reporting';
comment on view public.units_min_v is 'Minimal unit information for reporting';
comment on view public.document_types_summary_v is 'Summary of document types per building';
comment on view public.compliance_by_type_v is 'Compliance status grouped by asset type';
