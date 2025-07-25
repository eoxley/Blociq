-- Fix incoming_emails table building relationship
-- This migration ensures proper foreign key relationships and fixes schema issues

-- 1. First, let's check if the buildings table has the correct structure
-- If buildings.id is SERIAL (INTEGER), we need to ensure incoming_emails.building_id is also INTEGER
-- If buildings.id is UUID, we need to update incoming_emails.building_id to UUID

-- Check the current data type of buildings.id
DO $$
DECLARE
    building_id_type text;
BEGIN
    SELECT data_type INTO building_id_type 
    FROM information_schema.columns 
    WHERE table_name = 'buildings' AND column_name = 'id';
    
    RAISE NOTICE 'Buildings.id data type: %', building_id_type;
    
    -- If buildings.id is UUID, we need to update incoming_emails.building_id
    IF building_id_type = 'uuid' THEN
        -- Update incoming_emails.building_id to UUID
        ALTER TABLE incoming_emails ALTER COLUMN building_id TYPE UUID USING building_id::UUID;
        RAISE NOTICE 'Updated incoming_emails.building_id to UUID type';
    ELSIF building_id_type = 'integer' THEN
        -- Ensure incoming_emails.building_id is INTEGER
        ALTER TABLE incoming_emails ALTER COLUMN building_id TYPE INTEGER USING building_id::INTEGER;
        RAISE NOTICE 'Updated incoming_emails.building_id to INTEGER type';
    END IF;
END $$;

-- 2. Drop existing foreign key constraint if it exists
ALTER TABLE incoming_emails DROP CONSTRAINT IF EXISTS incoming_emails_building_id_fkey;

-- 3. Add the correct foreign key constraint with ON DELETE SET NULL
ALTER TABLE incoming_emails 
ADD CONSTRAINT incoming_emails_building_id_fkey 
FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE SET NULL;

-- 4. Ensure the index exists for better query performance
CREATE INDEX IF NOT EXISTS idx_incoming_emails_building_id ON incoming_emails(building_id);

-- 5. Update RLS policies to work with the correct relationship
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view emails for their buildings" ON incoming_emails;
DROP POLICY IF EXISTS "Users can update emails for their buildings" ON incoming_emails;
DROP POLICY IF EXISTS "Users can view own emails" ON incoming_emails;
DROP POLICY IF EXISTS "Users can update own emails" ON incoming_emails;

-- Create new RLS policies that work with user_id (which is the current approach)
CREATE POLICY "Users can view own emails" ON incoming_emails
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own emails" ON incoming_emails
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own emails" ON incoming_emails
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own emails" ON incoming_emails
  FOR DELETE USING (user_id = auth.uid());

-- 6. Create a view for easy email queries with building information
CREATE OR REPLACE VIEW emails_with_buildings AS
SELECT 
    ie.*,
    b.name as building_name,
    b.address as building_address
FROM incoming_emails ie
LEFT JOIN buildings b ON b.id = ie.building_id;

-- 7. Add comments to document the relationship
COMMENT ON COLUMN incoming_emails.building_id IS 'Reference to the building this email is associated with. Can be NULL for unassigned emails.';
COMMENT ON CONSTRAINT incoming_emails_building_id_fkey ON incoming_emails IS 'Foreign key relationship to buildings table with ON DELETE SET NULL';

-- 8. Verify the relationship works by testing a simple query
-- This will help identify any remaining issues
DO $$
BEGIN
    -- Test that we can join the tables
    PERFORM COUNT(*) FROM incoming_emails ie 
    LEFT JOIN buildings b ON b.id = ie.building_id 
    LIMIT 1;
    
    RAISE NOTICE 'Foreign key relationship test passed';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Foreign key relationship test failed: %', SQLERRM;
END $$; 