-- Fix vw_units_leaseholders view to include all required columns
-- This view should include building information, unit details, and leaseholder data

DROP VIEW IF EXISTS public.vw_units_leaseholders;

CREATE OR REPLACE VIEW public.vw_units_leaseholders AS
SELECT 
  -- Unit information
  u.id as unit_id,
  u.building_id,
  u.unit_number,
  u.unit_number as unit_label,
  u.type as unit_type,
  u.floor,
  u.apportionment_percent,
  u.created_at as unit_created_at,
  u.updated_at as unit_updated_at,
  
  -- Building information (required for queries like 'ashwood', 'property_name', 'address')
  b.id as building_id_ref,
  b.name as building_name,
  b.name as property_name,  -- Alias for property queries
  b.address,
  b.postcode,
  b.building_type,
  b.unit_count,
  b.building_manager_name,
  b.building_manager_email,
  b.building_manager_phone,
  b.emergency_contact_name,
  b.emergency_contact_phone,
  
  -- Leaseholder information
  l.id as leaseholder_id,
  COALESCE(l.full_name, l.name) as leaseholder_name,
  COALESCE(l.full_name, l.name) as tenant_name,  -- Alias for tenant queries
  l.email as leaseholder_email,
  l.phone as leaseholder_phone,
  l.correspondence_address,
  l.created_at as leaseholder_created_at,
  l.updated_at as leaseholder_updated_at,
  
  -- Director information
  l.is_director,
  CASE 
    WHEN l.is_director THEN 
      CASE 
        WHEN l.name ILIKE '%chair%' OR l.name ILIKE '%chairperson%' THEN 'Chair'
        WHEN l.name ILIKE '%secretary%' THEN 'Secretary'
        WHEN l.name ILIKE '%treasurer%' THEN 'Treasurer'
        WHEN l.name ILIKE '%director%' THEN 'Director'
        ELSE 'Director'
      END
    ELSE NULL
  END as director_role,
  l.director_since,
  l.director_notes,
  
  -- Lease information (if available)
  'Active' as lease_status,  -- Default status, can be enhanced with actual lease table
  NULL as lease_start_date,  -- Placeholder for lease start
  NULL as lease_end_date,    -- Placeholder for lease end  
  NULL as monthly_rent,      -- Placeholder for rent amount
  NULL as phone              -- Fallback phone field for compatibility

FROM public.buildings b
JOIN public.units u ON u.building_id = b.id
LEFT JOIN public.leaseholders l ON u.leaseholder_id = l.id

ORDER BY b.name, u.unit_number;

-- Grant permissions
GRANT SELECT ON public.vw_units_leaseholders TO authenticated;
GRANT SELECT ON public.vw_units_leaseholders TO anon;

-- Add documentation
COMMENT ON VIEW public.vw_units_leaseholders IS 
'Comprehensive view combining buildings, units, and leaseholders for AI queries. 
Includes aliases for common query patterns: property_name, tenant_name, address, etc.';