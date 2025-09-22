-- Add missing doc_category column to existing document_jobs table
-- This column is required for the new document lab system

BEGIN;

-- Add doc_category column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'document_jobs'
        AND column_name = 'doc_category'
    ) THEN
        -- Add the doc_category column
        ALTER TABLE document_jobs
        ADD COLUMN doc_category TEXT CHECK (doc_category IN ('compliance', 'general', 'major-works', 'lease'));

        -- Set default value for existing records based on context or set to 'general'
        UPDATE document_jobs
        SET doc_category = CASE
            -- Try to infer category from filename or other clues
            WHEN filename ILIKE '%eicr%' OR filename ILIKE '%fire%' OR filename ILIKE '%gas%' OR filename ILIKE '%compliance%' THEN 'compliance'
            WHEN filename ILIKE '%lease%' OR filename ILIKE '%tenancy%' THEN 'lease'
            WHEN filename ILIKE '%works%' OR filename ILIKE '%construction%' OR filename ILIKE '%building%' THEN 'major-works'
            ELSE 'general'
        END
        WHERE doc_category IS NULL;

        -- Set NOT NULL constraint after updating existing records
        ALTER TABLE document_jobs
        ALTER COLUMN doc_category SET NOT NULL;

        -- Set default value for future inserts
        ALTER TABLE document_jobs
        ALTER COLUMN doc_category SET DEFAULT 'general';

        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_document_jobs_doc_category ON document_jobs(doc_category);

        RAISE NOTICE 'Added doc_category column to document_jobs table';
    ELSE
        RAISE NOTICE 'doc_category column already exists in document_jobs table';
    END IF;
END $$;

-- Add agency_id column if it doesn't exist (needed for multi-tenancy)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'document_jobs'
        AND column_name = 'agency_id'
    ) THEN
        -- Add the agency_id column
        ALTER TABLE document_jobs
        ADD COLUMN agency_id UUID;

        -- Try to set agency_id for existing records by looking up user's agency
        UPDATE document_jobs
        SET agency_id = (
            SELECT agency_id
            FROM profiles
            WHERE profiles.id = document_jobs.user_id
            LIMIT 1
        )
        WHERE agency_id IS NULL;

        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_document_jobs_agency_id ON document_jobs(agency_id);

        RAISE NOTICE 'Added agency_id column to document_jobs table';
    ELSE
        RAISE NOTICE 'agency_id column already exists in document_jobs table';
    END IF;
END $$;

-- Add other missing columns that might be needed
DO $$
BEGIN
    -- Add linked_building_id if it doesn't exist
    IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'document_jobs'
        AND column_name = 'linked_building_id'
    ) THEN
        ALTER TABLE document_jobs
        ADD COLUMN linked_building_id UUID;

        CREATE INDEX IF NOT EXISTS idx_document_jobs_linked_building_id ON document_jobs(linked_building_id);

        RAISE NOTICE 'Added linked_building_id column to document_jobs table';
    END IF;

    -- Add linked_unit_id if it doesn't exist
    IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'document_jobs'
        AND column_name = 'linked_unit_id'
    ) THEN
        ALTER TABLE document_jobs
        ADD COLUMN linked_unit_id UUID;

        RAISE NOTICE 'Added linked_unit_id column to document_jobs table';
    END IF;

    -- Add doc_type_guess if it doesn't exist
    IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'document_jobs'
        AND column_name = 'doc_type_guess'
    ) THEN
        ALTER TABLE document_jobs
        ADD COLUMN doc_type_guess TEXT;

        RAISE NOTICE 'Added doc_type_guess column to document_jobs table';
    END IF;

    -- Add error_code if it doesn't exist
    IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'document_jobs'
        AND column_name = 'error_code'
    ) THEN
        ALTER TABLE document_jobs
        ADD COLUMN error_code TEXT;

        RAISE NOTICE 'Added error_code column to document_jobs table';
    END IF;

    -- Add error_message if it doesn't exist
    IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'document_jobs'
        AND column_name = 'error_message'
    ) THEN
        ALTER TABLE document_jobs
        ADD COLUMN error_message TEXT;

        RAISE NOTICE 'Added error_message column to document_jobs table';
    END IF;

    -- Add summary_json if it doesn't exist
    IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'document_jobs'
        AND column_name = 'summary_json'
    ) THEN
        ALTER TABLE document_jobs
        ADD COLUMN summary_json JSONB;

        RAISE NOTICE 'Added summary_json column to document_jobs table';
    END IF;
END $$;

-- Update table comment
COMMENT ON TABLE document_jobs IS 'Jobs for document processing in the document lab system (compliance, general, major-works, lease)';
COMMENT ON COLUMN document_jobs.doc_category IS 'Category of document: compliance, general, major-works, lease';

COMMIT;

-- Show final table structure
\d document_jobs;

-- Test the fix with a sample query that was failing
SELECT doc_category, COUNT(*) as count
FROM document_jobs
GROUP BY doc_category
ORDER BY count DESC;

RAISE NOTICE 'Document jobs table migration completed successfully!';