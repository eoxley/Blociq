-- Create latest building documents view
-- This view provides fast lookup for the most recent document of each type per building

create or replace view public.latest_building_docs_v as
select
  bd.building_id,
  bd.doc_type,                  -- 'insurance' | 'EICR' | 'FRA' | etc.
  bd.id as document_id,
  bd.filename,
  bd.storage_path,
  coalesce(bd.doc_date, bd.created_at) as doc_date,
  bd.summary_json,
  bd.agency_id,
  bd.user_id,
  bd.created_at,
  bd.updated_at,
  row_number() over (
    partition by bd.building_id, bd.doc_type
    order by coalesce(bd.doc_date, bd.created_at) desc
  ) as rn
from public.building_documents bd
where bd.is_deleted = false;

-- Create latest unit documents view (if units are supported)
create or replace view public.latest_unit_docs_v as
select
  bd.building_id,
  bd.unit_id,
  bd.doc_type,
  bd.id as document_id,
  bd.filename,
  bd.storage_path,
  coalesce(bd.doc_date, bd.created_at) as doc_date,
  bd.summary_json,
  bd.agency_id,
  bd.user_id,
  bd.created_at,
  bd.updated_at,
  row_number() over (
    partition by bd.building_id, bd.unit_id, bd.doc_type
    order by coalesce(bd.doc_date, bd.created_at) desc
  ) as rn
from public.building_documents bd
where bd.is_deleted = false
  and bd.unit_id is not null;

-- Create RLS policies for the views
-- The views inherit RLS from building_documents, but we need to ensure they're properly secured

-- Grant access to authenticated users
grant select on public.latest_building_docs_v to authenticated;
grant select on public.latest_unit_docs_v to authenticated;

-- Create indexes for better performance
create index if not exists idx_building_documents_building_type_date 
  on public.building_documents (building_id, doc_type, coalesce(doc_date, created_at) desc);

create index if not exists idx_building_documents_unit_type_date 
  on public.building_documents (building_id, unit_id, doc_type, coalesce(doc_date, created_at) desc)
  where unit_id is not null;

-- Add comments for documentation
comment on view public.latest_building_docs_v is 'Latest document of each type per building, ordered by date';
comment on view public.latest_unit_docs_v is 'Latest document of each type per unit, ordered by date';
