-- Fix missing tables that are causing 400 errors
-- Safe migration - only creates if tables don't exist

-- Create communications_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.communications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text,
  building_id uuid REFERENCES buildings(id),
  unit_id uuid,
  leaseholder_id uuid,
  subject text,
  content text,
  sent_at timestamptz DEFAULT now(),
  sent_by uuid,
  building_name text,
  leaseholder_name text,
  unit_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create property_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.property_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  description text,
  date date,
  building_id uuid REFERENCES buildings(id),
  event_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_communications_log_building ON public.communications_log(building_id);
CREATE INDEX IF NOT EXISTS idx_communications_log_sent_at ON public.communications_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_property_events_building ON public.property_events(building_id);
CREATE INDEX IF NOT EXISTS idx_property_events_date ON public.property_events(date);

-- Add RLS policies if they don't exist
ALTER TABLE public.communications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_events ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (safe defaults)
CREATE POLICY IF NOT EXISTS "Users can view communications_log" ON public.communications_log
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can view property_events" ON public.property_events
  FOR SELECT USING (true);
