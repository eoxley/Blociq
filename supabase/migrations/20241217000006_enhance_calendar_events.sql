-- Enhance calendar_events table for better calendar sync
-- This migration adds fields for enhanced calendar event tracking

-- Add new columns for enhanced calendar sync
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'singleInstance',
ADD COLUMN IF NOT EXISTS series_master_id UUID,
ADD COLUMN IF NOT EXISTS recurrence JSONB;

-- Add comments for the new columns
COMMENT ON COLUMN calendar_events.event_type IS 'Type of calendar event: singleInstance, occurrence, exception, or seriesMaster';
COMMENT ON COLUMN calendar_events.series_master_id IS 'ID of the series master for recurring events';
COMMENT ON COLUMN calendar_events.recurrence IS 'Recurrence pattern for recurring events (JSON)';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_series_master_id ON calendar_events(series_master_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_recurrence ON calendar_events USING GIN(recurrence);

-- Add constraint for event_type values
ALTER TABLE calendar_events 
ADD CONSTRAINT check_event_type 
CHECK (event_type IN ('singleInstance', 'occurrence', 'exception', 'seriesMaster'));

-- Update existing records to have default event_type
UPDATE calendar_events 
SET event_type = 'singleInstance' 
WHERE event_type IS NULL;

-- Add RLS policies for the new columns
ALTER POLICY "Users can view their own calendar events" ON calendar_events
USING (auth.uid() = user_id);

ALTER POLICY "Users can insert their own calendar events" ON calendar_events
FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER POLICY "Users can update their own calendar events" ON calendar_events
FOR UPDATE USING (auth.uid() = user_id);

ALTER POLICY "Users can delete their own calendar events" ON calendar_events
FOR DELETE USING (auth.uid() = user_id); 