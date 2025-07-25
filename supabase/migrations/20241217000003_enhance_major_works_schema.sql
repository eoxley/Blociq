-- Enhance major_works_projects table schema for improved API
-- This migration adds missing fields and improves the table structure

-- Add missing columns to major_works_projects table
DO $$ BEGIN
    -- Add title column (alias for name)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'major_works_projects' AND column_name = 'title') THEN
        ALTER TABLE major_works_projects ADD COLUMN title TEXT;
        -- Copy existing name data to title
        UPDATE major_works_projects SET title = name WHERE title IS NULL;
        RAISE NOTICE 'Added title column to major_works_projects table';
    END IF;
END $$;

-- Add created_by column for user tracking
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'major_works_projects' AND column_name = 'created_by') THEN
        ALTER TABLE major_works_projects ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added created_by column to major_works_projects table';
    END IF;
END $$;

-- Add project_type column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'major_works_projects' AND column_name = 'project_type') THEN
        ALTER TABLE major_works_projects ADD COLUMN project_type TEXT DEFAULT 'general';
        RAISE NOTICE 'Added project_type column to major_works_projects table';
    END IF;
END $$;

-- Add priority column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'major_works_projects' AND column_name = 'priority') THEN
        ALTER TABLE major_works_projects ADD COLUMN priority TEXT DEFAULT 'medium' CHECK (
            priority IN ('low', 'medium', 'high', 'critical')
        );
        RAISE NOTICE 'Added priority column to major_works_projects table';
    END IF;
END $$;

-- Add start_date column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'major_works_projects' AND column_name = 'start_date') THEN
        ALTER TABLE major_works_projects ADD COLUMN start_date DATE;
        RAISE NOTICE 'Added start_date column to major_works_projects table';
    END IF;
END $$;

-- Add expected_duration column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'major_works_projects' AND column_name = 'expected_duration') THEN
        ALTER TABLE major_works_projects ADD COLUMN expected_duration INTEGER; -- in days
        RAISE NOTICE 'Added expected_duration column to major_works_projects table';
    END IF;
END $$;

-- Add completion_percentage column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'major_works_projects' AND column_name = 'completion_percentage') THEN
        ALTER TABLE major_works_projects ADD COLUMN completion_percentage INTEGER DEFAULT 0 CHECK (
            completion_percentage >= 0 AND completion_percentage <= 100
        );
        RAISE NOTICE 'Added completion_percentage column to major_works_projects table';
    END IF;
END $$;

-- Add is_active column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'major_works_projects' AND column_name = 'is_active') THEN
        ALTER TABLE major_works_projects ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Added is_active column to major_works_projects table';
    END IF;
END $$;

-- Add budget_allocated column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'major_works_projects' AND column_name = 'budget_allocated') THEN
        ALTER TABLE major_works_projects ADD COLUMN budget_allocated DECIMAL(12,2) DEFAULT 0;
        RAISE NOTICE 'Added budget_allocated column to major_works_projects table';
    END IF;
END $$;

-- Add attachments column for file references
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'major_works_projects' AND column_name = 'attachments') THEN
        ALTER TABLE major_works_projects ADD COLUMN attachments JSONB DEFAULT '[]';
        RAISE NOTICE 'Added attachments column to major_works_projects table';
    END IF;
END $$;

-- Add stakeholders column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'major_works_projects' AND column_name = 'stakeholders') THEN
        ALTER TABLE major_works_projects ADD COLUMN stakeholders JSONB DEFAULT '[]';
        RAISE NOTICE 'Added stakeholders column to major_works_projects table';
    END IF;
END $$;

-- Add milestones column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'major_works_projects' AND column_name = 'milestones') THEN
        ALTER TABLE major_works_projects ADD COLUMN milestones JSONB DEFAULT '[]';
        RAISE NOTICE 'Added milestones column to major_works_projects table';
    END IF;
END $$;

-- Update status enum to include new statuses
ALTER TABLE major_works_projects DROP CONSTRAINT IF EXISTS major_works_projects_status_check;
ALTER TABLE major_works_projects ADD CONSTRAINT major_works_projects_status_check 
    CHECK (status IN (
        'planning',
        'notice_of_intention',
        'statement_of_estimates',
        'contractor_appointed',
        'works_in_progress',
        'completed',
        'on_hold',
        'cancelled'
    ));

-- Create major_works_logs table for project activity tracking
CREATE TABLE IF NOT EXISTS major_works_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES major_works_projects(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_major_works_projects_title ON major_works_projects(title);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_created_by ON major_works_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_project_type ON major_works_projects(project_type);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_priority ON major_works_projects(priority);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_start_date ON major_works_projects(start_date);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_completion_percentage ON major_works_projects(completion_percentage);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_is_active ON major_works_projects(is_active);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_budget_allocated ON major_works_projects(budget_allocated);

-- Create indexes for logs table
CREATE INDEX IF NOT EXISTS idx_major_works_logs_project_id ON major_works_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_major_works_logs_action ON major_works_logs(action);
CREATE INDEX IF NOT EXISTS idx_major_works_logs_user_id ON major_works_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_major_works_logs_timestamp ON major_works_logs(timestamp DESC);

-- Enable RLS on logs table
ALTER TABLE major_works_logs ENABLE ROW LEVEL SECURITY;

-- Add comments for new columns
COMMENT ON COLUMN major_works_projects.title IS 'Project title (alias for name)';
COMMENT ON COLUMN major_works_projects.created_by IS 'User who created the project';
COMMENT ON COLUMN major_works_projects.project_type IS 'Type of major works project';
COMMENT ON COLUMN major_works_projects.priority IS 'Project priority level';
COMMENT ON COLUMN major_works_projects.start_date IS 'Project start date';
COMMENT ON COLUMN major_works_projects.expected_duration IS 'Expected project duration in days';
COMMENT ON COLUMN major_works_projects.completion_percentage IS 'Project completion percentage (0-100)';
COMMENT ON COLUMN major_works_projects.is_active IS 'Whether the project is currently active';
COMMENT ON COLUMN major_works_projects.budget_allocated IS 'Total budget allocated for the project';
COMMENT ON COLUMN major_works_projects.attachments IS 'JSON array of attachment references';
COMMENT ON COLUMN major_works_projects.stakeholders IS 'JSON array of project stakeholders';
COMMENT ON COLUMN major_works_projects.milestones IS 'JSON array of project milestones'; 