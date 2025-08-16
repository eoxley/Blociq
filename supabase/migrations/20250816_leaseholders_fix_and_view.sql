-- Drop the view first since it depends on the is_director column
DROP VIEW IF EXISTS public.vw_units_leaseholders;

-- Ensure is_director is boolean
ALTER TABLE public.leaseholders ALTER COLUMN is_director TYPE boolean USING is_director::boolean;

-- Create view for units and leaseholders with normalized names
CREATE OR REPLACE VIEW public.vw_units_leaseholders AS
SELECT 
  u.id as unit_id,
  u.building_id,
  u.unit_number,
  u.unit_number as unit_label,
  u.apportionment_percent,
  l.id as leaseholder_id,
  COALESCE(l.full_name, l.name) as leaseholder_name,
  l.email as leaseholder_email,
  l.phone as leaseholder_phone,
  l.is_director,
  CASE 
    WHEN l.is_director THEN 
      CASE 
        WHEN l.name ILIKE '%chair%' THEN 'Chair'
        WHEN l.name ILIKE '%secretary%' THEN 'Secretary'
        WHEN l.name ILIKE '%treasurer%' THEN 'Treasurer'
        ELSE 'Director'
      END
    ELSE NULL
  END as director_role,
  l.director_since,
  l.director_notes
FROM public.units u
LEFT JOIN public.leaseholders l ON u.leaseholder_id = l.id
ORDER BY u.unit_number;
