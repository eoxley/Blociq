# Fix Sample Emails Guide

This guide helps you fix the sample emails issue where emails in the database don't have a `user_id` set, making them inaccessible due to Row Level Security (RLS) policies.

## Problem

The sample emails in the database were created without a `user_id`, which means they're blocked by RLS policies and can't be accessed by users in the application.

## Solution

### Option 1: Using the Simple Script (Recommended)

1. **Get your Supabase credentials**:
   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Copy your Project URL and Service Role Key

2. **Run the fix script**:
   ```bash
   # Method 1: Pass credentials as arguments
   npm run fix:emails:simple <YOUR_SUPABASE_URL> <YOUR_SERVICE_ROLE_KEY>
   
   # Method 2: Set environment variables first
   export NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
   export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
   npm run fix:emails:simple
   ```

### Option 2: Using Environment File

1. **Create or update your `.env.local` file**:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Run the fix script**:
   ```bash
   npm run fix:emails
   ```

### Option 3: Manual Database Update

If you prefer to run the SQL directly:

1. **Connect to your Supabase database** (via SQL editor or psql)
2. **Run the migration**:
   ```sql
   -- This will update all emails without user_id to have the first user's ID
   UPDATE incoming_emails 
   SET user_id = (SELECT id FROM auth.users LIMIT 1)
   WHERE user_id IS NULL;
   ```

## Verification

After running the fix, you can verify it worked by:

1. **Using the test buttons** in the inbox page:
   - Click "Test DB" to check database connectivity
   - Click "Test Emails" to check authenticated email access

2. **Checking the console logs** for success messages

3. **Refreshing the inbox page** to see if emails now appear

## Troubleshooting

### "Missing Supabase environment variables"

This means the script can't find your Supabase credentials. Make sure:

1. You have a `.env.local` file with the correct variables
2. You're passing the credentials as command line arguments
3. The environment variables are set correctly

### "No users found in auth.users table"

This means you need to create a user first:

1. Go to your application and sign up/sign in
2. This will create a user in the `auth.users` table
3. Then run the fix script again

### "Database connection failed"

Check that:
1. Your Supabase URL is correct
2. Your Service Role Key is correct
3. Your Supabase project is active
4. The `incoming_emails` table exists

## What the Script Does

1. **Connects to your Supabase database** using the service role key
2. **Finds the first user** in the `auth.users` table
3. **Counts emails without user_id** in the `incoming_emails` table
4. **Updates those emails** to have the user's ID
5. **Verifies the update** was successful
6. **Shows sample results** for confirmation

## Security Note

The script uses the Service Role Key, which bypasses RLS policies. This is necessary to update the sample data, but should only be used for this specific purpose. Never expose your Service Role Key in client-side code. 