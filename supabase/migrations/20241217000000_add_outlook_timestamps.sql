-- Add Outlook timestamps to calendar_events table
-- This helps track when events were created and modified in Outlook

ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS created_at_outlook TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS modified_at_outlook TIMESTAMP WITH TIME ZONE;

-- Add comments for the new columns
COMMENT ON COLUMN calendar_events.created_at_outlook IS 'Timestamp when the event was created in Outlook';
COMMENT ON COLUMN calendar_events.modified_at_outlook IS 'Timestamp when the event was last modified in Outlook';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_at_outlook ON calendar_events(created_at_outlook);
CREATE INDEX IF NOT EXISTS idx_calendar_events_modified_at_outlook ON calendar_events(modified_at_outlook); 