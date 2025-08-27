-- Create or replace the view for units and leaseholders
create or replace view vw_units_leaseholders as
select
  b.name as building_name,
  u.unit_label,
  l.name as leaseholder_name,
  l.email as leaseholder_email
from buildings b
join units u on u.building_id = b.id
left join leaseholders l on l.unit_id = u.id;

-- Grant access to authenticated users
grant select on vw_units_leaseholders to authenticated;

-- Add comment for documentation
comment on view vw_units_leaseholders is 'View for quick leaseholder lookup by building and unit';
