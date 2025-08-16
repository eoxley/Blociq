-- 1) Ensure UI can read a display name
-- If your column is text 'true'/'false', cast it to boolean once; otherwise skip the ALTER.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name='leaseholders' and column_name='is_director' and data_type in ('text','character varying')
  ) then
    alter table public.leaseholders
      alter column is_director type boolean using (nullif(is_director,'')::boolean);
  end if;
end$$;

-- 2) Normalise name for display without overwriting your data:
create or replace view public.vw_units_leaseholders as
select
  u.id as unit_id,
  u.building_id,
  u.unit_number,
  u.label as unit_label,
  u.apportionment_percent,
  l.id as leaseholder_id,
  coalesce(l.name, l.full_name) as leaseholder_name,
  l.email as leaseholder_email,
  l.phone_number as leaseholder_phone,
  l.is_director,
  l.director_since,
  l.director_notes,
  -- derive a role tag from director_notes
  case
    when l.is_director is true and l.director_notes ilike '%chair%' then 'Chair'
    when l.is_director is true and l.director_notes ilike '%secretary%' then 'Secretary'
    when l.is_director is true and l.director_notes ilike '%treasurer%' then 'Treasurer'
    when l.is_director is true then 'Director'
    else null
  end as director_role
from public.units u
left join public.leaseholders l on l.unit_id = u.id;
