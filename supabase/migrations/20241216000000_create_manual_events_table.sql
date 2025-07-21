-- Create manual_events table
CREATE TABLE IF NOT EXISTS manual_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  location TEXT,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  category TEXT DEFAULT 'Manual Entry',
  is_all_day BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_manual_events_user_id ON manual_events(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_events_start_time ON manual_events(start_time);
CREATE INDEX IF NOT EXISTS idx_manual_events_building_id ON manual_events(building_id);
CREATE INDEX IF NOT EXISTS idx_manual_events_category ON manual_events(category);

-- Enable RLS
ALTER TABLE manual_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own manual events" ON manual_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own manual events" ON manual_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own manual events" ON manual_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own manual events" ON manual_events
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_manual_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_manual_events_updated_at
  BEFORE UPDATE ON manual_events
  FOR EACH ROW
  EXECUTE FUNCTION update_manual_events_updated_at(); 