-- Create events table for storing user events
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    building TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_building ON events(building);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own events
CREATE POLICY "Users can view own events" ON events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON events
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON events
    FOR DELETE USING (auth.uid() = user_id);

-- Add comment to document the table
COMMENT ON TABLE events IS 'User events created in BlocIQ';
COMMENT ON COLUMN events.title IS 'Event title';
COMMENT ON COLUMN events.date IS 'Event date and time';
COMMENT ON COLUMN events.building IS 'Associated building (optional)';
COMMENT ON COLUMN events.user_id IS 'User who owns this event (for RLS)'; 