-- Script to Purge Old Outlook Tokens
-- Run this AFTER updating environment variables and deploying

-- 1. Check current tokens (before deletion)
SELECT 'Current outlook_tokens before cleanup:' as info;
SELECT 
  user_id,
  user_email,
  created_at,
  expires_at,
  CASE 
    WHEN expires_at < NOW() THEN 'EXPIRED'
    ELSE 'ACTIVE'
  END as status
FROM outlook_tokens;

-- 2. Show total count
SELECT 'Total tokens to be deleted: ' || COUNT(*) as count_info
FROM outlook_tokens;

-- 3. Delete all tokens (forces everyone to reconnect with new app)
-- UNCOMMENT THE LINE BELOW WHEN READY TO DELETE:
-- DELETE FROM outlook_tokens;

-- Alternative: Delete only for specific user
-- UNCOMMENT AND REPLACE <your_user_id> WITH ACTUAL USER ID:
-- DELETE FROM outlook_tokens WHERE user_id = '<your_user_id>';

-- 4. Verify deletion
SELECT 'Remaining tokens after cleanup: ' || COUNT(*) as remaining_count
FROM outlook_tokens;

-- 5. Instructions for users
SELECT 'IMPORTANT: All users must now reconnect their Outlook accounts!' as instruction;

-- 6. Check for any other token-related tables that might need cleanup
SELECT 'Other tables that might contain Outlook references:' as info;

-- Check if there are any cached sessions or other auth data
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%token%' 
   OR table_name LIKE '%session%' 
   OR table_name LIKE '%auth%'
   OR table_name LIKE '%outlook%'
ORDER BY table_name;
