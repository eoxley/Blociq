-- Add missing profile fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS job_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS signature_text TEXT,
ADD COLUMN IF NOT EXISTS signature_url TEXT,
ADD COLUMN IF NOT EXISTS email_signature TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_first_name ON profiles(first_name);
CREATE INDEX IF NOT EXISTS idx_profiles_last_name ON profiles(last_name);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);