-- Add missing columns to users table that are referenced in API routes
-- Migration: 20250131_add_missing_users_columns.sql

-- Add missing profile columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_company_name ON users(company_name);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);

-- Add comments for documentation
COMMENT ON COLUMN users.company_name IS 'Company or organization name for the user';
COMMENT ON COLUMN users.phone_number IS 'User phone number for contact purposes';