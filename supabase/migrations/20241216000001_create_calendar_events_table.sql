-- Create calendar_events table for storing Outlook calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outlook_id TEXT UNIQUE NOT NULL,
  subject TEXT,
  description TEXT,
  location TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  is_all_day BOOLEAN DEFAULT FALSE,
  organiser TEXT,
  organiser_name TEXT,
  attendees JSONB DEFAULT '[]',
  recurrence JSONB,
  importance TEXT DEFAULT 'normal',
  sensitivity TEXT DEFAULT 'normal',
  show_as TEXT DEFAULT 'busy',
  categories TEXT[] DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  web_link TEXT,
  online_meeting JSONB,
  created_at_app TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at_app TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_outlook_id ON calendar_events(outlook_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_organiser ON calendar_events(organiser);
CREATE INDEX IF NOT EXISTS idx_calendar_events_categories ON calendar_events USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_calendar_events_last_sync_at ON calendar_events(last_sync_at);

-- Enable Row Level Security
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own calendar events" ON calendar_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own calendar events" ON calendar_events
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own calendar events" ON calendar_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own calendar events" ON calendar_events
  FOR DELETE USING (user_id = auth.uid());

-- Create trigger to automatically update updated_at_app
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at_app = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_events_updated_at();

-- Add comments to document the columns
COMMENT ON TABLE calendar_events IS 'Calendar events synced from Microsoft Outlook';
COMMENT ON COLUMN calendar_events.outlook_id IS 'Unique identifier from Outlook calendar';
COMMENT ON COLUMN calendar_events.subject IS 'Event subject/title';
COMMENT ON COLUMN calendar_events.description IS 'Event description or body content';
COMMENT ON COLUMN calendar_events.location IS 'Event location';
COMMENT ON COLUMN calendar_events.start_time IS 'Event start time';
COMMENT ON COLUMN calendar_events.end_time IS 'Event end time';
COMMENT ON COLUMN calendar_events.is_all_day IS 'Whether the event is an all-day event';
COMMENT ON COLUMN calendar_events.organiser IS 'Event organizer email address';
COMMENT ON COLUMN calendar_events.organiser_name IS 'Event organizer display name';
COMMENT ON COLUMN calendar_events.attendees IS 'JSON array of event attendees with email, name, and response status';
COMMENT ON COLUMN calendar_events.recurrence IS 'Recurrence pattern for recurring events';
COMMENT ON COLUMN calendar_events.importance IS 'Event importance level (low, normal, high)';
COMMENT ON COLUMN calendar_events.sensitivity IS 'Event sensitivity level (normal, personal, private, confidential)';
COMMENT ON COLUMN calendar_events.show_as IS 'How the event appears in calendar (free, tentative, busy, oof, workingElsewhere)';
COMMENT ON COLUMN calendar_events.categories IS 'Array of event categories/tags';
COMMENT ON COLUMN calendar_events.user_id IS 'User who owns this calendar event (for RLS)';
COMMENT ON COLUMN calendar_events.last_sync_at IS 'Timestamp of last sync operation';
COMMENT ON COLUMN calendar_events.web_link IS 'Web link to view the event in Outlook';
COMMENT ON COLUMN calendar_events.online_meeting IS 'JSON object containing online meeting details (join URL, provider)'; 