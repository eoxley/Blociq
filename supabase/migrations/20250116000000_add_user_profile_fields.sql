-- Add profile fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS job_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS signature_text TEXT,
ADD COLUMN IF NOT EXISTS signature_url TEXT,
ADD COLUMN IF NOT EXISTS email_signature TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);
