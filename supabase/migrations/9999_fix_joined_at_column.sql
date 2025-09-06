-- Fix missing joined_at column in agency_members table
-- This migration ensures the joined_at column exists and has proper defaults

-- Add joined_at column if it doesn't exist
DO $$
BEGIN
  -- Check if joined_at column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'agency_members' 
    AND column_name = 'joined_at'
    AND table_schema = 'public'
  ) THEN
    -- Add the column with default value
    ALTER TABLE public.agency_members 
    ADD COLUMN joined_at timestamptz NOT NULL DEFAULT now();
    
    -- Update existing rows to have joined_at = created_at if created_at exists
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'agency_members' 
      AND column_name = 'created_at'
      AND table_schema = 'public'
    ) THEN
      UPDATE public.agency_members 
      SET joined_at = created_at 
      WHERE joined_at IS NULL;
    END IF;
    
    RAISE NOTICE 'Added joined_at column to agency_members table';
  ELSE
    RAISE NOTICE 'joined_at column already exists in agency_members table';
  END IF;
END $$;

-- Verify the column exists and has data
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'agency_members' 
  AND column_name = 'joined_at'
  AND table_schema = 'public';

-- Show sample data to verify
SELECT 
  agency_id,
  user_id,
  role,
  invitation_status,
  joined_at,
  created_at
FROM public.agency_members 
LIMIT 5;
