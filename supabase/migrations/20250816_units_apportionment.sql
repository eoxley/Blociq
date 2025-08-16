-- Add per-unit apportionment as percent (0–100), nullable for now
alter table public.units
  add column if not exists apportionment_percent numeric(6,3),
  add constraint units_apportionment_percent_chk
    check (apportionment_percent is null or (apportionment_percent >= 0 and apportionment_percent <= 100));

-- Optional helper: sum check per building (soft – create a view for dashboards instead of a hard constraint)
-- create or replace view public.vw_building_apportionment_sums as
--   select building_id, round(sum(coalesce(apportionment_percent,0)),3) as sum_percent
--   from public.units group by building_id;
