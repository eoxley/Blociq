-- Add calendar_event_id column to building_compliance_assets table
-- This column stores the Microsoft Graph event ID for synced calendar events

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'building_compliance_assets' 
        AND column_name = 'calendar_event_id'
    ) THEN
        ALTER TABLE building_compliance_assets 
        ADD COLUMN calendar_event_id TEXT;
        
        -- Add a comment to describe the column
        COMMENT ON COLUMN building_compliance_assets.calendar_event_id IS 'Microsoft Graph event ID for synced calendar events';
        
        -- Create an index for better performance when querying by calendar_event_id
        CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_calendar_event_id 
        ON building_compliance_assets(calendar_event_id);
        
        RAISE NOTICE 'Added calendar_event_id column to building_compliance_assets table';
    ELSE
        RAISE NOTICE 'calendar_event_id column already exists in building_compliance_assets table';
    END IF;
END $$;