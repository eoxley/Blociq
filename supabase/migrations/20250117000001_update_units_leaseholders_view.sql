-- Drop the existing view if it exists
DROP VIEW IF EXISTS vw_units_leaseholders;

-- Create updated view that works with existing table structure
CREATE VIEW vw_units_leaseholders AS
SELECT 
  u.id as unit_id,
  u.building_id,
  u.unit_number,
  u.type,
  u.floor,
  u.apportionment_percent,
  u.created_at as unit_created_at,
  
  -- Leaseholder information (may be null if unit is unoccupied)
  l.id as leaseholder_id,
  COALESCE(l.full_name, l.name) as leaseholder_name,
  l.email as leaseholder_email,
  COALESCE(l.phone_number, l.phone) as leaseholder_phone,
  l.correspondence_address,
  l.created_at as leaseholder_created_at,
  
  -- Director information
  l.is_director,
  l.director_since,
  l.director_notes,
  CASE 
    WHEN l.is_director AND l.director_notes IS NOT NULL THEN 
      CASE 
        WHEN l.director_notes LIKE '%Chairman%' THEN 'Chairman'
        WHEN l.director_notes LIKE '%Secretary%' THEN 'Secretary'
        WHEN l.director_notes LIKE '%Treasurer%' THEN 'Treasurer'
        ELSE 'Director'
      END
    WHEN l.is_director THEN 'Director'
    ELSE NULL
  END as director_role
  
FROM units u
LEFT JOIN leaseholders l ON u.id = l.unit_id
ORDER BY 
  CASE 
    WHEN u.unit_number ~ '^[0-9]+$' THEN CAST(u.unit_number AS INTEGER)
    ELSE 999999
  END,
  u.unit_number;
