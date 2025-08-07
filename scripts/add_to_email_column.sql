-- Add to_email column to incoming_emails table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'incoming_emails' AND column_name = 'to_email'
    ) THEN
        ALTER TABLE incoming_emails ADD COLUMN to_email TEXT[];
        RAISE NOTICE 'Added to_email column to incoming_emails table';
    ELSE
        RAISE NOTICE 'to_email column already exists in incoming_emails table';
    END IF;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_incoming_emails_to_email ON incoming_emails USING GIN(to_email);

-- Update existing records to have empty array for to_email if they don't have it
UPDATE incoming_emails 
SET to_email = ARRAY[]::TEXT[] 
WHERE to_email IS NULL; 