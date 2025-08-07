-- Create property_events table if it doesn't exist
-- This migration ensures the property_events table is created in the database

CREATE TABLE IF NOT EXISTS property_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  event_type VARCHAR(100),
  category VARCHAR(100),
  outlook_event_id VARCHAR(255),
  location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_events_building_id ON property_events(building_id);
CREATE INDEX IF NOT EXISTS idx_property_events_start_time ON property_events(start_time);
CREATE INDEX IF NOT EXISTS idx_property_events_event_type ON property_events(event_type);
CREATE INDEX IF NOT EXISTS idx_property_events_category ON property_events(category);
CREATE INDEX IF NOT EXISTS idx_property_events_created_by ON property_events(created_by);

-- Enable Row Level Security
ALTER TABLE property_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view property events" ON property_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert property events" ON property_events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update property events" ON property_events
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete property events" ON property_events
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_property_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_property_events_updated_at
  BEFORE UPDATE ON property_events
  FOR EACH ROW
  EXECUTE FUNCTION update_property_events_updated_at();

-- Add comments to document the table
COMMENT ON TABLE property_events IS 'Property events for buildings';
COMMENT ON COLUMN property_events.building_id IS 'Reference to the building this event belongs to';
COMMENT ON COLUMN property_events.title IS 'Event title';
COMMENT ON COLUMN property_events.description IS 'Event description';
COMMENT ON COLUMN property_events.start_time IS 'Event start time';
COMMENT ON COLUMN property_events.end_time IS 'Event end time (optional)';
COMMENT ON COLUMN property_events.event_type IS 'Type of event (AGM, FRA, INSPECTION, etc.)';
COMMENT ON COLUMN property_events.category IS 'Event category';
COMMENT ON COLUMN property_events.outlook_event_id IS 'ID of corresponding Outlook calendar event';
COMMENT ON COLUMN property_events.location IS 'Event location'; 