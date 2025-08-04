-- Add body_full column to incoming_emails table
-- This column is required by the sync-inbox API route

ALTER TABLE incoming_emails 
ADD COLUMN IF NOT EXISTS body_full TEXT; 