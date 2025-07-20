-- Add notification field to project_observations table
ALTER TABLE project_observations 
ADD COLUMN IF NOT EXISTS notify_director BOOLEAN DEFAULT false;

-- Create notifications table for observation alerts
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_role TEXT NOT NULL CHECK (recipient_role IN ('director', 'leaseholder', 'contractor')),
    project_id BIGINT NOT NULL REFERENCES major_works(id) ON DELETE CASCADE,
    observation_id BIGINT NOT NULL REFERENCES project_observations(id) ON DELETE CASCADE,
    seen BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_project_observations_comment_gin ON project_observations USING gin(to_tsvector('english', comment));
CREATE INDEX IF NOT EXISTS idx_project_observations_created_at_search ON project_observations(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON notifications(recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_seen ON notifications(seen);

-- Add RLS policies for notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notifications" ON notifications
    FOR SELECT USING (true);

CREATE POLICY "Users can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update notifications" ON notifications
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete notifications" ON notifications
    FOR DELETE USING (true);

-- Create function to handle observation notifications
CREATE OR REPLACE FUNCTION handle_observation_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- If notify_director is true, create a notification
    IF NEW.notify_director = true THEN
        INSERT INTO notifications (recipient_role, project_id, observation_id, seen, created_at)
        VALUES ('director', NEW.project_id, NEW.id, false, NOW());
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create notifications
DROP TRIGGER IF EXISTS trigger_observation_notification ON project_observations;
CREATE TRIGGER trigger_observation_notification
    AFTER INSERT ON project_observations
    FOR EACH ROW
    EXECUTE FUNCTION handle_observation_notification();

-- Create function to search observations with full-text search
CREATE OR REPLACE FUNCTION search_project_observations(
    search_query TEXT,
    project_id_param BIGINT DEFAULT NULL,
    phase_filter TEXT DEFAULT NULL,
    observer_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    project_id BIGINT,
    phase TEXT,
    observer_type TEXT,
    comment TEXT,
    notify_director BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    search_rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        po.id,
        po.project_id,
        po.phase,
        po.observer_type,
        po.comment,
        po.notify_director,
        po.created_at,
        ts_rank(to_tsvector('english', po.comment), plainto_tsquery('english', search_query)) as search_rank
    FROM project_observations po
    WHERE 
        (project_id_param IS NULL OR po.project_id = project_id_param)
        AND (phase_filter IS NULL OR po.phase = phase_filter)
        AND (observer_type_filter IS NULL OR po.observer_type = observer_type_filter)
        AND (
            search_query IS NULL 
            OR search_query = ''
            OR to_tsvector('english', po.comment) @@ plainto_tsquery('english', search_query)
            OR po.observer_type ILIKE '%' || search_query || '%'
            OR po.phase ILIKE '%' || search_query || '%'
            OR po.created_at::text ILIKE '%' || search_query || '%'
        )
    ORDER BY 
        CASE WHEN search_query IS NOT NULL AND search_query != '' 
             THEN ts_rank(to_tsvector('english', po.comment), plainto_tsquery('english', search_query))
             ELSE 0 
        END DESC,
        po.created_at DESC;
END;
$$ LANGUAGE plpgsql; 