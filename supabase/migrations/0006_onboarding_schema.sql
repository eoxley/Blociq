-- ========================================
-- ONBOARDING SCHEMA ENHANCEMENT
-- Migration: 0006_onboarding_schema.sql
-- Description: Complete schema for smooth agency onboarding
-- ========================================

-- ========================================
-- 1. ENHANCE AGENCIES TABLE
-- ========================================

-- Add onboarding-specific fields to agencies
ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS postcode text,
ADD COLUMN IF NOT EXISTS company_number text,
ADD COLUMN IF NOT EXISTS vat_number text,
ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'in_progress', 'completed', 'archived')),
ADD COLUMN IF NOT EXISTS onboarded_at timestamptz,
ADD COLUMN IF NOT EXISTS notes text;

-- ========================================
-- 2. ENHANCE BUILDINGS TABLE
-- ========================================

-- Add essential onboarding fields to buildings
ALTER TABLE public.buildings 
ADD COLUMN IF NOT EXISTS postcode text,
ADD COLUMN IF NOT EXISTS building_type text DEFAULT 'residential' CHECK (building_type IN ('residential', 'commercial', 'mixed_use')),
ADD COLUMN IF NOT EXISTS is_hrb boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS year_built integer,
ADD COLUMN IF NOT EXISTS storeys integer,
ADD COLUMN IF NOT EXISTS total_units integer,
ADD COLUMN IF NOT EXISTS management_start_date date,
ADD COLUMN IF NOT EXISTS freeholder_name text,
ADD COLUMN IF NOT EXISTS freeholder_address text,
ADD COLUMN IF NOT EXISTS lease_term_years integer,
ADD COLUMN IF NOT EXISTS ground_rent_review_pattern text,
ADD COLUMN IF NOT EXISTS service_charge_budget decimal(12,2),
ADD COLUMN IF NOT EXISTS reserve_fund_balance decimal(12,2),
ADD COLUMN IF NOT EXISTS insurance_renewal_date date,
ADD COLUMN IF NOT EXISTS onboarding_notes text;

-- Make agency_id NOT NULL for buildings (with safe default)
UPDATE public.buildings SET agency_id = (SELECT id FROM public.agencies WHERE slug = 'mih' LIMIT 1) WHERE agency_id IS NULL;
ALTER TABLE public.buildings ALTER COLUMN agency_id SET NOT NULL;

-- ========================================
-- 3. ENHANCE UNITS TABLE  
-- ========================================

-- Add essential unit fields
ALTER TABLE public.units
ADD COLUMN IF NOT EXISTS unit_type text DEFAULT 'flat' CHECK (unit_type IN ('flat', 'maisonette', 'house', 'commercial', 'parking', 'storage')),
ADD COLUMN IF NOT EXISTS bedrooms integer,
ADD COLUMN IF NOT EXISTS bathrooms integer,
ADD COLUMN IF NOT EXISTS sqft integer,
ADD COLUMN IF NOT EXISTS sqm numeric(8,2),
ADD COLUMN IF NOT EXISTS balcony boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parking_spaces integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS lease_start_date date,
ADD COLUMN IF NOT EXISTS lease_end_date date,
ADD COLUMN IF NOT EXISTS ground_rent_pa decimal(10,2),
ADD COLUMN IF NOT EXISTS service_charge_pa decimal(10,2),
ADD COLUMN IF NOT EXISTS is_let boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS tenant_name text,
ADD COLUMN IF NOT EXISTS tenant_email text,
ADD COLUMN IF NOT EXISTS tenant_phone text;

-- Make agency_id NOT NULL for units
UPDATE public.units SET agency_id = (SELECT agency_id FROM public.buildings WHERE buildings.id = units.building_id) WHERE agency_id IS NULL;
ALTER TABLE public.units ALTER COLUMN agency_id SET NOT NULL;

-- ========================================
-- 4. ENHANCE LEASEHOLDERS TABLE
-- ========================================

-- Add comprehensive leaseholder fields
ALTER TABLE public.leaseholders
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS correspondence_address text,
ADD COLUMN IF NOT EXISTS correspondence_postcode text,
ADD COLUMN IF NOT EXISTS home_phone text,
ADD COLUMN IF NOT EXISTS mobile_phone text,
ADD COLUMN IF NOT EXISTS work_phone text,
ADD COLUMN IF NOT EXISTS preferred_contact_method text DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'post')),
ADD COLUMN IF NOT EXISTS is_company boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_director boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS director_position text,
ADD COLUMN IF NOT EXISTS director_since date,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS notes text;

-- Make agency_id NOT NULL for leaseholders
UPDATE public.leaseholders SET agency_id = (SELECT agency_id FROM public.units WHERE units.id = leaseholders.unit_id) WHERE agency_id IS NULL;
ALTER TABLE public.leaseholders ALTER COLUMN agency_id SET NOT NULL;

-- ========================================
-- 5. ENHANCE LEASES TABLE
-- ========================================

-- Add comprehensive lease fields
ALTER TABLE public.leases
ADD COLUMN IF NOT EXISTS lease_type text DEFAULT 'residential' CHECK (lease_type IN ('residential', 'commercial', 'ground', 'head')),
ADD COLUMN IF NOT EXISTS original_term_years integer,
ADD COLUMN IF NOT EXISTS unexpired_term_years integer,
ADD COLUMN IF NOT EXISTS annual_ground_rent decimal(10,2),
ADD COLUMN IF NOT EXISTS ground_rent_review_date date,
ADD COLUMN IF NOT EXISTS ground_rent_doubling_period integer,
ADD COLUMN IF NOT EXISTS service_charge_percentage numeric(6,3),
ADD COLUMN IF NOT EXISTS lease_premium decimal(12,2),
ADD COLUMN IF NOT EXISTS deed_of_variation text,
ADD COLUMN IF NOT EXISTS restrictions text,
ADD COLUMN IF NOT EXISTS permitted_use text,
ADD COLUMN IF NOT EXISTS alterations_clause text,
ADD COLUMN IF NOT EXISTS subletting_permitted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pets_permitted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS lease_plan_attached boolean DEFAULT false;

-- Make agency_id NOT NULL for leases
UPDATE public.leases SET agency_id = (SELECT agency_id FROM public.units WHERE units.id = leases.unit_id) WHERE agency_id IS NULL;
ALTER TABLE public.leases ALTER COLUMN agency_id SET NOT NULL;

-- ========================================
-- 6. CREATE UNIT APPORTIONMENTS TABLE
-- ========================================

-- Dedicated table for service charge apportionments
CREATE TABLE IF NOT EXISTS public.unit_apportionments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE RESTRICT,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  
  -- Apportionment details
  apportionment_type text NOT NULL DEFAULT 'service_charge' CHECK (apportionment_type IN ('service_charge', 'reserve_fund', 'ground_rent', 'insurance')),
  percentage numeric(6,3) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  fixed_amount decimal(10,2),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_until date,
  
  -- Metadata
  calculation_method text CHECK (calculation_method IN ('percentage', 'fixed_amount', 'per_unit', 'by_floor_area')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(unit_id, apportionment_type, effective_from),
  CHECK (effective_until IS NULL OR effective_until > effective_from)
);

-- Migrate existing apportionment data
INSERT INTO public.unit_apportionments (agency_id, building_id, unit_id, percentage, effective_from)
SELECT 
  u.agency_id,
  u.building_id,
  u.id,
  u.apportionment_percent,
  CURRENT_DATE
FROM public.units u
WHERE u.apportionment_percent IS NOT NULL
ON CONFLICT DO NOTHING;

-- ========================================
-- 7. ENHANCE COMPLIANCE MASTER ASSETS
-- ========================================

-- Rename compliance_assets to compliance_master_assets for clarity
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='compliance_assets') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='compliance_master_assets') THEN
    ALTER TABLE public.compliance_assets RENAME TO compliance_master_assets;
    RAISE NOTICE 'Renamed compliance_assets to compliance_master_assets';
  END IF;
END$$;

-- Ensure compliance_master_assets has proper structure
CREATE TABLE IF NOT EXISTS public.compliance_master_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Asset identification
  asset_code text UNIQUE NOT NULL, -- e.g., 'EICR', 'FRA', 'FIRE_DOORS'
  asset_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('electrical', 'fire_safety', 'gas', 'structural', 'environmental', 'health_safety', 'building_safety')),
  
  -- Requirements
  description text,
  frequency_months integer NOT NULL,
  is_mandatory boolean DEFAULT true,
  applies_to_hrb_only boolean DEFAULT false,
  legislation_reference text,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean DEFAULT true
);

-- ========================================
-- 8. ENHANCE BUILDING COMPLIANCE ASSETS
-- ========================================

-- Add missing fields to building_compliance_assets
ALTER TABLE public.building_compliance_assets
ADD COLUMN IF NOT EXISTS compliance_master_asset_id uuid REFERENCES public.compliance_master_assets(id) ON DELETE RESTRICT,
ADD COLUMN IF NOT EXISTS contractor_name text,
ADD COLUMN IF NOT EXISTS contractor_email text,
ADD COLUMN IF NOT EXISTS contractor_phone text,
ADD COLUMN IF NOT EXISTS certificate_reference text,
ADD COLUMN IF NOT EXISTS certificate_url text,
ADD COLUMN IF NOT EXISTS last_inspection_date date,
ADD COLUMN IF NOT EXISTS next_inspection_due date,
ADD COLUMN IF NOT EXISTS cost decimal(10,2),
ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS compliance_notes text;

-- Make agency_id NOT NULL for building_compliance_assets
UPDATE public.building_compliance_assets SET agency_id = (SELECT agency_id FROM public.buildings WHERE buildings.id = building_compliance_assets.building_id) WHERE agency_id IS NULL;
ALTER TABLE public.building_compliance_assets ALTER COLUMN agency_id SET NOT NULL;

-- ========================================
-- 9. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Unit apportionments indexes
CREATE INDEX IF NOT EXISTS idx_unit_apportionments_agency_id ON public.unit_apportionments(agency_id);
CREATE INDEX IF NOT EXISTS idx_unit_apportionments_building_id ON public.unit_apportionments(building_id);
CREATE INDEX IF NOT EXISTS idx_unit_apportionments_unit_id ON public.unit_apportionments(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_apportionments_type ON public.unit_apportionments(apportionment_type);
CREATE INDEX IF NOT EXISTS idx_unit_apportionments_effective ON public.unit_apportionments(effective_from, effective_until);

-- Enhanced building indexes
CREATE INDEX IF NOT EXISTS idx_buildings_postcode ON public.buildings(postcode);
CREATE INDEX IF NOT EXISTS idx_buildings_is_hrb ON public.buildings(is_hrb);
CREATE INDEX IF NOT EXISTS idx_buildings_management_start ON public.buildings(management_start_date);

-- Enhanced unit indexes
CREATE INDEX IF NOT EXISTS idx_units_unit_type ON public.units(unit_type);
CREATE INDEX IF NOT EXISTS idx_units_is_let ON public.units(is_let);
CREATE INDEX IF NOT EXISTS idx_units_lease_end ON public.units(lease_end_date);

-- Enhanced leaseholder indexes
CREATE INDEX IF NOT EXISTS idx_leaseholders_company_name ON public.leaseholders(company_name);
CREATE INDEX IF NOT EXISTS idx_leaseholders_is_director ON public.leaseholders(is_director);
CREATE INDEX IF NOT EXISTS idx_leaseholders_preferred_contact ON public.leaseholders(preferred_contact_method);

-- Compliance master assets indexes
CREATE INDEX IF NOT EXISTS idx_compliance_master_assets_code ON public.compliance_master_assets(asset_code);
CREATE INDEX IF NOT EXISTS idx_compliance_master_assets_category ON public.compliance_master_assets(category);
CREATE INDEX IF NOT EXISTS idx_compliance_master_assets_mandatory ON public.compliance_master_assets(is_mandatory);
CREATE INDEX IF NOT EXISTS idx_compliance_master_assets_hrb ON public.compliance_master_assets(applies_to_hrb_only);

-- ========================================
-- 10. SEED COMPLIANCE MASTER ASSETS
-- ========================================

-- Insert standard compliance assets for UK property management
INSERT INTO public.compliance_master_assets (asset_code, asset_name, category, description, frequency_months, is_mandatory, applies_to_hrb_only, legislation_reference) VALUES
-- Electrical
('EICR', 'Electrical Installation Condition Report', 'electrical', 'Comprehensive electrical safety inspection of fixed installations', 60, true, false, 'Landlord and Tenant Act 1985, Housing Act 2004'),
('PAT', 'Portable Appliance Testing', 'electrical', 'Testing of portable electrical appliances in common areas', 12, false, false, 'Electricity at Work Regulations 1989'),
('EMERGENCY_LIGHTING', 'Emergency Lighting Test', 'electrical', 'Monthly testing and annual certification of emergency lighting systems', 12, true, false, 'BS 5266-1:2016'),

-- Fire Safety
('FRA', 'Fire Risk Assessment', 'fire_safety', 'Comprehensive fire risk assessment of common areas', 12, true, false, 'Regulatory Reform (Fire Safety) Order 2005'),
('FIRE_DOORS', 'Fire Door Inspection', 'fire_safety', 'Annual inspection of fire doors and seals', 12, true, false, 'Building Regulations Part B'),
('FIRE_ALARM', 'Fire Alarm System Service', 'fire_safety', 'Quarterly service and annual certification of fire alarm systems', 3, true, false, 'BS 5839-1:2017'),
('FIRE_EXTINGUISHERS', 'Fire Extinguisher Service', 'fire_safety', 'Annual service and inspection of fire extinguishers', 12, true, false, 'BS 5306-3:2009'),
('AOV_SYSTEMS', 'Automatic Opening Vent Systems', 'fire_safety', 'Annual service and testing of smoke ventilation systems', 12, false, false, 'BS 7346-4:2003'),

-- Gas Safety
('GAS_SAFETY', 'Gas Safety Check', 'gas', 'Annual gas appliance safety inspection', 12, true, false, 'Gas Safety (Installation and Use) Regulations 1998'),
('BOILER_SERVICE', 'Boiler Service', 'gas', 'Annual boiler service and maintenance', 12, true, false, 'Gas Safety (Installation and Use) Regulations 1998'),

-- Structural
('STRUCTURAL_SURVEY', 'Structural Survey', 'structural', 'Comprehensive structural condition assessment', 60, false, false, 'Building Act 1984'),
('LIFT_MAINTENANCE', 'Lift Maintenance', 'structural', 'Monthly maintenance and 6-monthly thorough examination', 6, true, false, 'Lifting Operations and Lifting Equipment Regulations 1998'),
('FACADE_INSPECTION', 'External Wall/Facade Inspection', 'structural', 'Annual inspection of external building fabric', 12, false, true, 'Building Safety Act 2022'),

-- Environmental
('ASBESTOS_SURVEY', 'Asbestos Management Survey', 'environmental', 'Asbestos presence and condition assessment', 36, true, false, 'Control of Asbestos Regulations 2012'),
('LEGIONELLA_ASSESSMENT', 'Legionella Risk Assessment', 'environmental', 'Water system legionella risk evaluation and management', 24, true, false, 'Health and Safety at Work Act 1974'),
('WATER_HYGIENE', 'Water System Hygiene Inspection', 'environmental', 'Annual water tank cleaning and system inspection', 12, true, false, 'Water Supply (Water Fittings) Regulations 1999'),

-- Health & Safety
('HEALTH_SAFETY_AUDIT', 'Health & Safety Audit', 'health_safety', 'Comprehensive health and safety compliance review', 12, true, false, 'Health and Safety at Work Act 1974'),
('FIRST_AID_REVIEW', 'First Aid Provision Review', 'health_safety', 'Annual review of first aid facilities and training', 12, false, false, 'Health and Safety (First-Aid) Regulations 1981'),

-- Building Safety Act (HRB specific)
('BUILDING_SAFETY_CASE', 'Building Safety Case', 'building_safety', 'Comprehensive building safety case for high-risk buildings', 12, true, true, 'Building Safety Act 2022'),
('GOLDEN_THREAD', 'Golden Thread Information', 'building_safety', 'Maintenance of golden thread documentation', 6, true, true, 'Building Safety Act 2022'),
('SAFETY_CASE_REPORT', 'Safety Case Report', 'building_safety', 'Annual safety case report submission', 12, true, true, 'Building Safety Act 2022'),
('MANDATORY_REPORTING', 'Mandatory Occurrence Reporting', 'building_safety', 'Ongoing mandatory occurrence reporting system', 1, true, true, 'Building Safety Act 2022')

ON CONFLICT (asset_code) DO UPDATE SET
  asset_name = EXCLUDED.asset_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  frequency_months = EXCLUDED.frequency_months,
  is_mandatory = EXCLUDED.is_mandatory,
  applies_to_hrb_only = EXCLUDED.applies_to_hrb_only,
  legislation_reference = EXCLUDED.legislation_reference,
  updated_at = now();

-- ========================================
-- 11. ADD FOREIGN KEY CONSTRAINTS
-- ========================================

-- Ensure proper foreign key relationships exist
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_building_id_fkey;
ALTER TABLE public.units ADD CONSTRAINT units_building_id_fkey 
  FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE CASCADE;

ALTER TABLE public.leaseholders DROP CONSTRAINT IF EXISTS leaseholders_unit_id_fkey;
ALTER TABLE public.leaseholders ADD CONSTRAINT leaseholders_unit_id_fkey 
  FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;

ALTER TABLE public.leases DROP CONSTRAINT IF EXISTS leases_unit_id_fkey;
ALTER TABLE public.leases ADD CONSTRAINT leases_unit_id_fkey 
  FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;

ALTER TABLE public.leases DROP CONSTRAINT IF EXISTS leases_building_id_fkey;
ALTER TABLE public.leases ADD CONSTRAINT leases_building_id_fkey 
  FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE CASCADE;

-- ========================================
-- 12. UPDATE RLS FOR NEW TABLES
-- ========================================

-- Enable RLS on new tables
ALTER TABLE public.unit_apportionments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_master_assets ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for unit_apportionments
CREATE POLICY "unit_apportionments: select own agency" ON public.unit_apportionments
  FOR SELECT USING (public.is_member_of_agency(agency_id));

CREATE POLICY "unit_apportionments: modify by manager+" ON public.unit_apportionments
  FOR ALL USING (
    public.is_member_of_agency(agency_id)
    AND EXISTS (
      SELECT 1 FROM public.agency_members m
      WHERE m.agency_id = unit_apportionments.agency_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner','admin','manager')
    )
  ) WITH CHECK (public.is_member_of_agency(agency_id));

-- Compliance master assets are readable by all authenticated users (they're templates)
CREATE POLICY "compliance_master_assets: readable by all" ON public.compliance_master_assets
  FOR SELECT TO authenticated USING (true);

-- Only system admins can modify master assets (add specific policy if needed)
CREATE POLICY "compliance_master_assets: admin only modify" ON public.compliance_master_assets
  FOR ALL USING (false); -- Restrict modifications for now

-- ========================================
-- 13. ADD HELPFUL COMMENTS
-- ========================================

COMMENT ON TABLE public.unit_apportionments IS 'Service charge and other apportionments for units within buildings';
COMMENT ON TABLE public.compliance_master_assets IS 'Master catalogue of compliance requirements for UK property management';
COMMENT ON COLUMN public.buildings.is_hrb IS 'Whether this building is classified as a High Risk Building under Building Safety Act 2022';
COMMENT ON COLUMN public.leaseholders.correspondence_address IS 'Alternative address for sending correspondence if different from unit address';
COMMENT ON COLUMN public.unit_apportionments.percentage IS 'Percentage share of costs (0-100)';
COMMENT ON COLUMN public.compliance_master_assets.applies_to_hrb_only IS 'Whether this compliance requirement only applies to High Risk Buildings';

-- ========================================
-- 14. VERIFICATION
-- ========================================

DO $$
DECLARE
  table_count int;
  constraint_count int;
  index_count int;
  compliance_assets_count int;
BEGIN
  -- Count core tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('agencies', 'agency_members', 'buildings', 'units', 'leaseholders', 'leases', 'unit_apportionments', 'building_documents', 'compliance_master_assets', 'building_compliance_assets');
  
  -- Count foreign key constraints
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints 
  WHERE table_schema = 'public' 
    AND constraint_type = 'FOREIGN KEY'
    AND table_name IN ('units', 'leaseholders', 'leases', 'unit_apportionments', 'building_compliance_assets');
  
  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE schemaname = 'public' 
    AND tablename IN ('buildings', 'units', 'leaseholders', 'unit_apportionments', 'compliance_master_assets');
  
  -- Count seeded compliance assets
  SELECT COUNT(*) INTO compliance_assets_count
  FROM public.compliance_master_assets;
  
  RAISE NOTICE 'ONBOARDING SCHEMA VERIFICATION:';
  RAISE NOTICE '- Core tables present: %', table_count;
  RAISE NOTICE '- Foreign key constraints: %', constraint_count;
  RAISE NOTICE '- Performance indexes: %', index_count;
  RAISE NOTICE '- Compliance assets seeded: %', compliance_assets_count;
  
  IF table_count >= 10 AND constraint_count >= 5 AND compliance_assets_count >= 15 THEN
    RAISE NOTICE '✅ ONBOARDING SCHEMA READY';
  ELSE
    RAISE WARNING '⚠️ ONBOARDING SCHEMA INCOMPLETE - Check individual components';
  END IF;
END$$;
