-- Migration: Create communications_followups table and update building_todos
-- Purpose: Support promise detection and follow-up tracking from email communications

-- Create communications_followups table
CREATE TABLE IF NOT EXISTS communications_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id TEXT,
    message_id TEXT,
    subject TEXT NOT NULL,
    matched_text TEXT NOT NULL,
    due_at TIMESTAMPTZ NOT NULL,
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    leaseholder_id UUID REFERENCES leaseholders(id) ON DELETE SET NULL,
    outlook_event_id TEXT,
    todo_id UUID REFERENCES building_todos(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_communications_followups_due_at ON communications_followups(due_at);
CREATE INDEX IF NOT EXISTS idx_communications_followups_building_id ON communications_followups(building_id);
CREATE INDEX IF NOT EXISTS idx_communications_followups_status ON communications_followups(status);
CREATE INDEX IF NOT EXISTS idx_communications_followups_thread_id ON communications_followups(thread_id);

-- Add source column to building_todos if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'building_todos'
        AND column_name = 'source'
    ) THEN
        ALTER TABLE building_todos
        ADD COLUMN source TEXT DEFAULT 'manual'
        CHECK (source IN ('manual', 'followup', 'compliance', 'maintenance', 'system'));
    END IF;
END $$;

-- Create updated_at trigger for communications_followups
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_communications_followups_updated_at
    BEFORE UPDATE ON communications_followups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE communications_followups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for communications_followups
-- Users can only see followups for buildings they have access to
CREATE POLICY "Users can view followups for their buildings" ON communications_followups
    FOR SELECT USING (
        building_id IN (
            SELECT building_id FROM user_building_access
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create followups for their buildings" ON communications_followups
    FOR INSERT WITH CHECK (
        building_id IN (
            SELECT building_id FROM user_building_access
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update followups for their buildings" ON communications_followups
    FOR UPDATE USING (
        building_id IN (
            SELECT building_id FROM user_building_access
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete followups for their buildings" ON communications_followups
    FOR DELETE USING (
        building_id IN (
            SELECT building_id FROM user_building_access
            WHERE user_id = auth.uid()
        )
    );

-- Add helpful comments
COMMENT ON TABLE communications_followups IS 'Tracks follow-up commitments made in email communications';
COMMENT ON COLUMN communications_followups.thread_id IS 'Email thread identifier for grouping related messages';
COMMENT ON COLUMN communications_followups.message_id IS 'Specific email message identifier';
COMMENT ON COLUMN communications_followups.matched_text IS 'The original promise text that was detected (e.g., "within 2 working days")';
COMMENT ON COLUMN communications_followups.due_at IS 'When the follow-up is due (computed from promise text)';
COMMENT ON COLUMN communications_followups.outlook_event_id IS 'ID of the Outlook calendar event created for this follow-up';
COMMENT ON COLUMN communications_followups.todo_id IS 'Linked building todo item for tracking';
COMMENT ON COLUMN communications_followups.status IS 'Current status of the follow-up commitment';

-- Create a view for active followups with building/unit details
CREATE OR REPLACE VIEW active_followups AS
SELECT
    f.*,
    b.name as building_name,
    u.unit_number,
    l.first_name,
    l.last_name,
    l.email as leaseholder_email,
    t.title as todo_title,
    t.status as todo_status
FROM communications_followups f
LEFT JOIN buildings b ON f.building_id = b.id
LEFT JOIN units u ON f.unit_id = u.id
LEFT JOIN leaseholders l ON f.leaseholder_id = l.id
LEFT JOIN building_todos t ON f.todo_id = t.id
WHERE f.status = 'pending'
AND f.due_at > NOW()
ORDER BY f.due_at ASC;

COMMENT ON VIEW active_followups IS 'Active follow-ups with building and leaseholder details for easy monitoring';