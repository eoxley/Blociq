-- Fix sample emails by adding user_id to them
-- This ensures the sample emails can be accessed by users through RLS policies

-- First, let's see what emails exist without user_id
SELECT 'Emails without user_id:' as info;
SELECT COUNT(*) as count FROM incoming_emails WHERE user_id IS NULL;

-- Update sample emails to have a user_id
-- We'll use the first user in the auth.users table, or create a default user if none exists
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user from auth.users
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    
    -- If no user exists, we can't update the emails
    IF first_user_id IS NULL THEN
        RAISE NOTICE 'No users found in auth.users table. Sample emails will not be accessible.';
    ELSE
        -- Update all emails without user_id to have the first user's ID
        UPDATE incoming_emails 
        SET user_id = first_user_id 
        WHERE user_id IS NULL;
        
        RAISE NOTICE 'Updated % emails with user_id: %', ROW_COUNT, first_user_id;
    END IF;
END $$;

-- Verify the update
SELECT 'Emails after update:' as info;
SELECT COUNT(*) as total_emails FROM incoming_emails;
SELECT COUNT(*) as emails_with_user_id FROM incoming_emails WHERE user_id IS NOT NULL;
SELECT COUNT(*) as emails_without_user_id FROM incoming_emails WHERE user_id IS NULL;

-- Show sample of updated emails
SELECT 'Sample updated emails:' as info;
SELECT id, subject, from_email, user_id, received_at 
FROM incoming_emails 
WHERE user_id IS NOT NULL 
ORDER BY received_at DESC 
LIMIT 5; 