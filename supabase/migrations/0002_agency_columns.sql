-- ========================================
-- MULTI-AGENCY SETUP: ADD AGENCY COLUMNS
-- Migration: 0002_agency_columns.sql
-- Description: Add agency_id columns to core domain tables and create indexes
-- ========================================

-- Helper function to safely add agency_id column to a table
CREATE OR REPLACE FUNCTION add_agency_id_column(table_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if column already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' 
      AND table_name = add_agency_id_column.table_name 
      AND column_name='agency_id'
  ) THEN
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE RESTRICT', table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(agency_id)', table_name || '_agency_idx', table_name);
    RAISE NOTICE 'Added agency_id column to %', table_name;
  ELSE
    RAISE NOTICE 'agency_id column already exists in %', table_name;
  END IF;
END;
$$;

-- Add agency_id to buildings table
SELECT add_agency_id_column('buildings');

-- Add agency_id to units table  
SELECT add_agency_id_column('units');

-- Add agency_id to leaseholders table
SELECT add_agency_id_column('leaseholders');

-- Add agency_id to building_documents table
SELECT add_agency_id_column('building_documents');

-- Add agency_id to incoming_emails table
SELECT add_agency_id_column('incoming_emails');

-- Add agency_id to building_compliance_assets table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='building_compliance_assets') THEN
    PERFORM add_agency_id_column('building_compliance_assets');
  END IF;
END$$;

-- Add agency_id to compliance_assets table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='compliance_assets') THEN
    PERFORM add_agency_id_column('compliance_assets');
  END IF;
END$$;

-- Add agency_id to ai_logs table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_logs') THEN
    PERFORM add_agency_id_column('ai_logs');
  END IF;
END$$;

-- Add agency_id to email_history table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='email_history') THEN
    PERFORM add_agency_id_column('email_history');
  END IF;
END$$;

-- Add agency_id to sent_emails table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sent_emails') THEN
    PERFORM add_agency_id_column('sent_emails');
  END IF;
END$$;

-- Add agency_id to building_setup table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='building_setup') THEN
    PERFORM add_agency_id_column('building_setup');
  END IF;
END$$;

-- Add agency_id to leases table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='leases') THEN
    PERFORM add_agency_id_column('leases');
  END IF;
END$$;

-- Add agency_id to contractors table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contractors') THEN
    PERFORM add_agency_id_column('contractors');
  END IF;
END$$;

-- Add agency_id to compliance_inspections table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='compliance_inspections') THEN
    PERFORM add_agency_id_column('compliance_inspections');
  END IF;
END$$;

-- Add agency_id to building_compliance_config table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='building_compliance_config') THEN
    PERFORM add_agency_id_column('building_compliance_config');
  END IF;
END$$;

-- Add agency_id to compliance_notifications table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='compliance_notifications') THEN
    PERFORM add_agency_id_column('compliance_notifications');
  END IF;
END$$;

-- Add agency_id to property_events table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='property_events') THEN
    PERFORM add_agency_id_column('property_events');
  END IF;
END$$;

-- Add agency_id to calendar_events table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='calendar_events') THEN
    PERFORM add_agency_id_column('calendar_events');
  END IF;
END$$;

-- Add agency_id to works_orders table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='works_orders') THEN
    PERFORM add_agency_id_column('works_orders');
  END IF;
END$$;

-- Drop the helper function after use
DROP FUNCTION add_agency_id_column(text);

-- Add comments for documentation
COMMENT ON COLUMN public.buildings.agency_id IS 'Agency that manages this building';
COMMENT ON COLUMN public.units.agency_id IS 'Agency that manages this unit (inherited from building)';
COMMENT ON COLUMN public.leaseholders.agency_id IS 'Agency that manages this leaseholder (inherited from unit/building)';
COMMENT ON COLUMN public.building_documents.agency_id IS 'Agency that owns this document';
COMMENT ON COLUMN public.incoming_emails.agency_id IS 'Agency that received this email';

-- Verify critical tables have agency_id columns
DO $$
DECLARE
  missing_tables text[] := '{}';
  table_name text;
  critical_tables text[] := ARRAY['buildings', 'units', 'leaseholders', 'building_documents', 'incoming_emails'];
BEGIN
  FOREACH table_name IN ARRAY critical_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' 
        AND table_name = table_name 
        AND column_name='agency_id'
    ) THEN
      missing_tables := array_append(missing_tables, table_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Critical tables missing agency_id column: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE 'All critical tables have agency_id columns successfully added';
  END IF;
END$$;
