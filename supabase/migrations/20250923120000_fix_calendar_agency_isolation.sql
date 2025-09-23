-- Fix calendar agency isolation by adding agency_id to property_events and updating RLS policies
-- This ensures users can only see calendar events from their own agency

-- Add agency_id column to property_events table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'property_events'
    AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE property_events ADD COLUMN agency_id UUID REFERENCES agencies(id);
    RAISE NOTICE 'Added agency_id column to property_events table';
  ELSE
    RAISE NOTICE 'agency_id column already exists in property_events table';
  END IF;
END$$;

-- Create index for better performance on agency_id lookups
CREATE INDEX IF NOT EXISTS idx_property_events_agency_id ON property_events(agency_id);

-- Update existing property_events to link to the correct agency
-- For events with building_id, use the building's agency
UPDATE property_events pe
SET agency_id = b.agency_id
FROM buildings b
WHERE pe.building_id = b.id
  AND pe.agency_id IS NULL
  AND b.agency_id IS NOT NULL;

-- For events without building_id but with created_by, use the creator's agency
UPDATE property_events pe
SET agency_id = p.agency_id
FROM profiles p
WHERE pe.created_by = p.id
  AND pe.agency_id IS NULL
  AND pe.building_id IS NULL
  AND p.agency_id IS NOT NULL;

-- For remaining events without agency, assign to the default BlocIQ agency
UPDATE property_events
SET agency_id = (
  SELECT id FROM agencies
  WHERE slug = 'blociq-property-management'
  LIMIT 1
)
WHERE agency_id IS NULL;

-- Drop existing overly permissive RLS policies
DROP POLICY IF EXISTS "Users can view property events" ON property_events;
DROP POLICY IF EXISTS "Users can insert property events" ON property_events;
DROP POLICY IF EXISTS "Users can update property events" ON property_events;
DROP POLICY IF EXISTS "Users can delete property events" ON property_events;

-- Create new agency-aware RLS policies
CREATE POLICY "Users can view events in their agency" ON property_events
  FOR SELECT USING (
    agency_id IN (
      SELECT p.agency_id
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert events in their agency" ON property_events
  FOR INSERT WITH CHECK (
    agency_id IN (
      SELECT p.agency_id
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can update events in their agency" ON property_events
  FOR UPDATE USING (
    agency_id IN (
      SELECT p.agency_id
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete events in their agency" ON property_events
  FOR DELETE USING (
    agency_id IN (
      SELECT p.agency_id
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

-- Ensure RLS is enabled
ALTER TABLE property_events ENABLE ROW LEVEL SECURITY;

-- Add a comment to document the change
COMMENT ON COLUMN property_events.agency_id IS 'Reference to the agency that owns this event - ensures calendar isolation between agencies';