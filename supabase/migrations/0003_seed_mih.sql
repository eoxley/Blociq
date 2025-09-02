-- ========================================
-- MULTI-AGENCY SETUP: SEED MIH AGENCY
-- Migration: 0003_seed_mih.sql
-- Description: Create MIH agency, assign users, and backfill existing data
-- ========================================

-- 1) Create MIH agency if it doesn't exist
INSERT INTO public.agencies (name, slug, domain, status, created_at)
VALUES ('MIH Property Management', 'mih', 'mihproperty.co.uk', 'active', NOW())
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Store MIH agency ID for use in this migration
CREATE TEMPORARY TABLE temp_mih_agency AS
SELECT id FROM public.agencies WHERE slug = 'mih';

-- 2) Add known users to MIH agency
-- Add testbloc@blociq.co.uk as owner
INSERT INTO public.agency_members (agency_id, user_id, role, invitation_status, joined_at)
SELECT 
  (SELECT id FROM temp_mih_agency),
  u.id,
  'owner'::public.agency_role,
  'accepted',
  NOW()
FROM auth.users u
WHERE u.email = 'testbloc@blociq.co.uk'
ON CONFLICT (agency_id, user_id) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();

-- Add eleanor.oxley@blociq.co.uk as admin
INSERT INTO public.agency_members (agency_id, user_id, role, invitation_status, joined_at)
SELECT 
  (SELECT id FROM temp_mih_agency),
  u.id,
  'admin'::public.agency_role,
  'accepted',
  NOW()
FROM auth.users u
WHERE u.email = 'eleanor.oxley@blociq.co.uk'
ON CONFLICT (agency_id, user_id) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();

-- Add any other existing users as managers (fallback for demo)
INSERT INTO public.agency_members (agency_id, user_id, role, invitation_status, joined_at)
SELECT 
  (SELECT id FROM temp_mih_agency),
  u.id,
  'manager'::public.agency_role,
  'accepted',
  NOW()
FROM auth.users u
WHERE u.email NOT IN ('testbloc@blociq.co.uk', 'eleanor.oxley@blociq.co.uk')
ON CONFLICT (agency_id, user_id) DO NOTHING;

-- 3) Backfill agency_id on buildings table
-- Set all existing buildings to MIH agency
UPDATE public.buildings 
SET agency_id = (SELECT id FROM temp_mih_agency)
WHERE agency_id IS NULL;

-- 4) Cascade agency_id down to related tables
-- Update units based on their building's agency
UPDATE public.units u
SET agency_id = b.agency_id
FROM public.buildings b
WHERE u.building_id = b.id 
  AND (u.agency_id IS NULL OR u.agency_id != b.agency_id);

-- Update leaseholders based on their unit's building
UPDATE public.leaseholders l
SET agency_id = b.agency_id
FROM public.units u
JOIN public.buildings b ON b.id = u.building_id
WHERE l.unit_id = u.id
  AND (l.agency_id IS NULL OR l.agency_id != b.agency_id);

-- Update building_documents based on building_id
UPDATE public.building_documents d
SET agency_id = b.agency_id
FROM public.buildings b
WHERE d.building_id = b.id
  AND (d.agency_id IS NULL OR d.agency_id != b.agency_id);

-- Update incoming_emails based on building_id (if they have one)
UPDATE public.incoming_emails e
SET agency_id = b.agency_id
FROM public.buildings b
WHERE e.building_id = b.id
  AND (e.agency_id IS NULL OR e.agency_id != b.agency_id);

-- For incoming_emails without building_id, set to MIH for demo safety
UPDATE public.incoming_emails
SET agency_id = (SELECT id FROM temp_mih_agency)
WHERE agency_id IS NULL;

-- 5) Update other tables if they exist
-- building_setup
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='building_setup') THEN
    EXECUTE '
      UPDATE public.building_setup bs
      SET agency_id = b.agency_id
      FROM public.buildings b
      WHERE bs.building_id = b.id
        AND (bs.agency_id IS NULL OR bs.agency_id != b.agency_id)
    ';
  END IF;
END$$;

-- leases
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='leases') THEN
    EXECUTE '
      UPDATE public.leases l
      SET agency_id = b.agency_id
      FROM public.buildings b
      WHERE l.building_id = b.id
        AND (l.agency_id IS NULL OR l.agency_id != b.agency_id)
    ';
  END IF;
END$$;

-- email_history
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='email_history') THEN
    EXECUTE '
      UPDATE public.email_history eh
      SET agency_id = b.agency_id
      FROM public.buildings b
      WHERE eh.building_id = b.id
        AND (eh.agency_id IS NULL OR eh.agency_id != b.agency_id);
      
      -- For email_history without building_id, set to MIH
      UPDATE public.email_history
      SET agency_id = (SELECT id FROM public.agencies WHERE slug = ''mih'')
      WHERE agency_id IS NULL;
    ';
  END IF;
END$$;

-- sent_emails (set to MIH for demo)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sent_emails') THEN
    EXECUTE '
      UPDATE public.sent_emails
      SET agency_id = (SELECT id FROM public.agencies WHERE slug = ''mih'')
      WHERE agency_id IS NULL
    ';
  END IF;
END$$;

-- compliance_assets
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='compliance_assets') THEN
    EXECUTE '
      UPDATE public.compliance_assets ca
      SET agency_id = b.agency_id
      FROM public.buildings b
      WHERE ca.building_id = b.id
        AND (ca.agency_id IS NULL OR ca.agency_id != b.agency_id)
    ';
  END IF;
END$$;

-- building_compliance_assets
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='building_compliance_assets') THEN
    EXECUTE '
      UPDATE public.building_compliance_assets bca
      SET agency_id = b.agency_id
      FROM public.buildings b
      WHERE bca.building_id = b.id
        AND (bca.agency_id IS NULL OR bca.agency_id != b.agency_id)
    ';
  END IF;
END$$;

-- compliance_inspections
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='compliance_inspections') THEN
    EXECUTE '
      UPDATE public.compliance_inspections ci
      SET agency_id = b.agency_id
      FROM public.buildings b
      WHERE ci.building_id = b.id
        AND (ci.agency_id IS NULL OR ci.agency_id != b.agency_id)
    ';
  END IF;
END$$;

-- building_compliance_config
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='building_compliance_config') THEN
    EXECUTE '
      UPDATE public.building_compliance_config bcc
      SET agency_id = b.agency_id
      FROM public.buildings b
      WHERE bcc.building_id = b.id
        AND (bcc.agency_id IS NULL OR bcc.agency_id != b.agency_id)
    ';
  END IF;
END$$;

-- compliance_notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='compliance_notifications') THEN
    EXECUTE '
      UPDATE public.compliance_notifications cn
      SET agency_id = b.agency_id
      FROM public.buildings b
      WHERE cn.building_id = b.id
        AND (cn.agency_id IS NULL OR cn.agency_id != b.agency_id)
    ';
  END IF;
END$$;

-- contractors (set to MIH for demo)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contractors') THEN
    EXECUTE '
      UPDATE public.contractors
      SET agency_id = (SELECT id FROM public.agencies WHERE slug = ''mih'')
      WHERE agency_id IS NULL
    ';
  END IF;
END$$;

-- ai_logs (set to MIH for demo)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_logs') THEN
    EXECUTE '
      UPDATE public.ai_logs
      SET agency_id = (SELECT id FROM public.agencies WHERE slug = ''mih'')
      WHERE agency_id IS NULL
    ';
  END IF;
END$$;

-- property_events
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='property_events') THEN
    EXECUTE '
      UPDATE public.property_events pe
      SET agency_id = b.agency_id
      FROM public.buildings b
      WHERE pe.building_id = b.id
        AND (pe.agency_id IS NULL OR pe.agency_id != b.agency_id)
    ';
  END IF;
END$$;

-- calendar_events
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='calendar_events') THEN
    EXECUTE '
      UPDATE public.calendar_events ce
      SET agency_id = b.agency_id
      FROM public.buildings b
      WHERE ce.building_id = b.id
        AND (ce.agency_id IS NULL OR ce.agency_id != b.agency_id);
      
      -- For calendar_events without building_id, set to MIH
      UPDATE public.calendar_events
      SET agency_id = (SELECT id FROM public.agencies WHERE slug = ''mih'')
      WHERE agency_id IS NULL;
    ';
  END IF;
END$$;

-- works_orders
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='works_orders') THEN
    EXECUTE '
      UPDATE public.works_orders wo
      SET agency_id = b.agency_id
      FROM public.buildings b
      WHERE wo.building_id = b.id
        AND (wo.agency_id IS NULL OR wo.agency_id != b.agency_id)
    ';
  END IF;
END$$;

-- Clean up temporary table
DROP TABLE temp_mih_agency;

-- 6) Verification and reporting
DO $$
DECLARE
  agency_count int;
  member_count int;
  building_count int;
  unit_count int;
  leaseholder_count int;
BEGIN
  SELECT COUNT(*) INTO agency_count FROM public.agencies WHERE slug = 'mih';
  SELECT COUNT(*) INTO member_count FROM public.agency_members am 
    JOIN public.agencies a ON a.id = am.agency_id 
    WHERE a.slug = 'mih';
  SELECT COUNT(*) INTO building_count FROM public.buildings b
    JOIN public.agencies a ON a.id = b.agency_id
    WHERE a.slug = 'mih';
  SELECT COUNT(*) INTO unit_count FROM public.units u
    JOIN public.agencies a ON a.id = u.agency_id
    WHERE a.slug = 'mih';
  SELECT COUNT(*) INTO leaseholder_count FROM public.leaseholders l
    JOIN public.agencies a ON a.id = l.agency_id
    WHERE a.slug = 'mih';
    
  RAISE NOTICE 'MIH Agency Setup Complete:';
  RAISE NOTICE '- Agencies: %', agency_count;
  RAISE NOTICE '- Members: %', member_count;
  RAISE NOTICE '- Buildings: %', building_count;
  RAISE NOTICE '- Units: %', unit_count;
  RAISE NOTICE '- Leaseholders: %', leaseholder_count;
  
  IF agency_count = 0 THEN
    RAISE EXCEPTION 'Failed to create MIH agency';
  END IF;
END$$;
