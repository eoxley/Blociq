-- Create or replace the view for units and leaseholders
create or replace view vw_units_leaseholders as
select
  u.id as unit_id,
  u.building_id,
  u.unit_number,
  u.type,
  u.floor,
  u.apportionment_percent,
  u.created_at as unit_created_at,
  l.id as leaseholder_id,
  l.name as leaseholder_name,
  l.email as leaseholder_email,
  l.phone as leaseholder_phone,
  l.correspondence_address,
  l.created_at as leaseholder_created_at,
  l.is_director,
  l.director_since,
  l.director_notes,
  l.director_role,
  b.name as building_name  -- ADD BUILDING NAME
from buildings b
join units u on u.building_id = b.id
left join leaseholders l on l.unit_id = u.id;

-- Grant access to authenticated users
grant select on vw_units_leaseholders to authenticated;

-- Add comment for documentation
comment on view vw_units_leaseholders is 'View for quick leaseholder lookup by building and unit';
