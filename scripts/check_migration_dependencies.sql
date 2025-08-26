-- Check Migration Dependencies
-- Run this script to verify that required tables exist before running the lease extraction migration

-- Check if buildings table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'buildings' AND table_schema = 'public') 
        THEN '✅ Buildings table exists' 
        ELSE '❌ Buildings table missing' 
    END as buildings_status;

-- Check if auth.users table exists (for foreign key references)
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'auth') 
        THEN '✅ Auth users table exists' 
        ELSE '❌ Auth users table missing' 
    END as auth_users_status;

-- Check if required extensions are available
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') 
        THEN '✅ UUID extension available' 
        ELSE '❌ UUID extension missing' 
    END as uuid_extension_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') 
        THEN '✅ pg_trgm extension available' 
        ELSE '❌ pg_trgm extension missing' 
    END as pg_trgm_extension_status;

-- Check current schema version (if you have a schema_migrations table)
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations') 
        THEN '✅ Schema migrations table exists' 
        ELSE '❌ Schema migrations table missing' 
    END as migrations_table_status;

-- List all tables in public schema
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
