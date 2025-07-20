-- Migration script to add missing columns to existing major_works table
-- This script adds the new columns without recreating the table

-- Add consultation_stage column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'major_works' AND column_name = 'consultation_stage') THEN
        ALTER TABLE major_works ADD COLUMN consultation_stage TEXT;
    END IF;
END $$;

-- Add section20_notice_issued column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'major_works' AND column_name = 'section20_notice_issued') THEN
        ALTER TABLE major_works ADD COLUMN section20_notice_issued DATE;
    END IF;
END $$;

-- Add estimated_start_date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'major_works' AND column_name = 'estimated_start_date') THEN
        ALTER TABLE major_works ADD COLUMN estimated_start_date DATE;
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'major_works' AND column_name = 'updated_at') THEN
        ALTER TABLE major_works ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Update existing records with default values
UPDATE major_works 
SET 
    consultation_stage = COALESCE(consultation_stage, 'Notice of Intention'),
    status = COALESCE(status, 'Planned'),
    updated_at = COALESCE(updated_at, NOW())
WHERE consultation_stage IS NULL OR status IS NULL OR updated_at IS NULL;

-- Add constraints after adding columns
ALTER TABLE major_works 
    ALTER COLUMN consultation_stage SET DEFAULT 'Notice of Intention',
    ALTER COLUMN status SET DEFAULT 'Planned';

-- Add check constraints if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'major_works_consultation_stage_check') THEN
        ALTER TABLE major_works ADD CONSTRAINT major_works_consultation_stage_check 
        CHECK (consultation_stage IN ('Notice of Intention', 'Estimates Review', 'Works in Progress'));
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'major_works_status_check') THEN
        ALTER TABLE major_works ADD CONSTRAINT major_works_status_check 
        CHECK (status IN ('Planned', 'Ongoing', 'Completed'));
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_major_works_status ON major_works(status);
CREATE INDEX IF NOT EXISTS idx_major_works_consultation_stage ON major_works(consultation_stage);
CREATE INDEX IF NOT EXISTS idx_major_works_created_at ON major_works(created_at DESC);

-- Show the current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'major_works' 
ORDER BY ordinal_position;

-- Show existing data
SELECT 
    id,
    title,
    consultation_stage,
    status,
    section20_notice_issued,
    estimated_start_date,
    created_at
FROM major_works 
ORDER BY created_at DESC; 