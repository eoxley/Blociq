-- Background Lease Processing System Migration
-- This migration creates the job queue system for async document processing

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create lease_processing_jobs table for background job queue
CREATE TABLE IF NOT EXISTS public.lease_processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
    
    -- Job status and tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    priority INTEGER DEFAULT 0, -- Higher numbers = higher priority
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Processing metadata
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    processing_duration_ms BIGINT,
    
    -- Results storage
    results JSONB,
    extracted_text TEXT,
    lease_analysis JSONB,
    ocr_source TEXT, -- 'external_ocr', 'openai_vision', etc.
    
    -- Error tracking
    error_message TEXT,
    error_details JSONB,
    last_error_at TIMESTAMP WITH TIME ZONE,
    
    -- Notification tracking
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    user_email TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient job processing
CREATE INDEX IF NOT EXISTS idx_lease_jobs_status ON public.lease_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_lease_jobs_priority_created ON public.lease_processing_jobs(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_lease_jobs_user_id ON public.lease_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_lease_jobs_document_id ON public.lease_processing_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_lease_jobs_building_id ON public.lease_processing_jobs(building_id);
CREATE INDEX IF NOT EXISTS idx_lease_jobs_created_at ON public.lease_processing_jobs(created_at);

-- Create composite index for job queue processing
CREATE INDEX IF NOT EXISTS idx_lease_jobs_queue_processing ON public.lease_processing_jobs(status, priority DESC, created_at ASC)
WHERE status IN ('pending', 'retrying');

-- Create job history table for auditing
CREATE TABLE IF NOT EXISTS public.lease_processing_job_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES public.lease_processing_jobs(id) ON DELETE CASCADE NOT NULL,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    error_message TEXT,
    processing_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT -- 'system', 'user', 'job_processor'
);

-- Create index for job history
CREATE INDEX IF NOT EXISTS idx_lease_job_history_job_id ON public.lease_processing_job_history(job_id);
CREATE INDEX IF NOT EXISTS idx_lease_job_history_created_at ON public.lease_processing_job_history(created_at);

-- Create function to update job status with history tracking
CREATE OR REPLACE FUNCTION public.update_lease_job_status(
    job_uuid UUID,
    new_status TEXT,
    error_msg TEXT DEFAULT NULL,
    processing_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    old_status TEXT;
    job_exists BOOLEAN;
BEGIN
    -- Get current status and check if job exists
    SELECT status INTO old_status 
    FROM public.lease_processing_jobs 
    WHERE id = job_uuid;
    
    job_exists := FOUND;
    
    IF NOT job_exists THEN
        RAISE EXCEPTION 'Job with ID % not found', job_uuid;
        RETURN FALSE;
    END IF;
    
    -- Update job status
    UPDATE public.lease_processing_jobs 
    SET 
        status = new_status,
        updated_at = NOW(),
        processing_started_at = CASE 
            WHEN new_status = 'processing' THEN NOW()
            ELSE processing_started_at
        END,
        processing_completed_at = CASE 
            WHEN new_status IN ('completed', 'failed') THEN NOW()
            ELSE processing_completed_at
        END,
        processing_duration_ms = CASE 
            WHEN new_status IN ('completed', 'failed') AND processing_started_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (NOW() - processing_started_at)) * 1000
            ELSE processing_duration_ms
        END,
        error_message = CASE 
            WHEN new_status = 'failed' THEN COALESCE(error_msg, error_message)
            WHEN new_status = 'completed' THEN NULL
            ELSE error_message
        END,
        last_error_at = CASE 
            WHEN new_status = 'failed' THEN NOW()
            ELSE last_error_at
        END,
        retry_count = CASE
            WHEN new_status = 'retrying' THEN retry_count + 1
            WHEN new_status = 'completed' THEN 0
            ELSE retry_count
        END
    WHERE id = job_uuid;
    
    -- Insert history record
    INSERT INTO public.lease_processing_job_history (
        job_id, 
        previous_status, 
        new_status, 
        error_message, 
        processing_notes,
        created_by
    ) VALUES (
        job_uuid, 
        old_status, 
        new_status, 
        error_msg, 
        processing_notes,
        'system'
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get next job from queue
CREATE OR REPLACE FUNCTION public.get_next_lease_processing_job()
RETURNS TABLE(
    job_id UUID,
    document_id UUID,
    user_id UUID,
    file_path TEXT,
    filename TEXT,
    file_size BIGINT,
    file_type TEXT,
    building_id UUID,
    retry_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.id as job_id,
        j.document_id,
        j.user_id,
        j.file_path,
        j.filename,
        j.file_size,
        j.file_type,
        j.building_id,
        j.retry_count,
        j.created_at
    FROM public.lease_processing_jobs j
    WHERE j.status IN ('pending', 'retrying')
    AND j.retry_count < j.max_retries
    ORDER BY j.priority DESC, j.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED; -- Prevent race conditions in multi-worker setup
END;
$$ LANGUAGE plpgsql;

-- Create function to get job statistics
CREATE OR REPLACE FUNCTION public.get_lease_processing_stats(
    user_uuid UUID DEFAULT NULL,
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE(
    total_jobs BIGINT,
    pending_jobs BIGINT,
    processing_jobs BIGINT,
    completed_jobs BIGINT,
    failed_jobs BIGINT,
    avg_processing_time_ms DECIMAL,
    success_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_jobs,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::BIGINT as pending_jobs,
        COUNT(CASE WHEN status = 'processing' THEN 1 END)::BIGINT as processing_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::BIGINT as completed_jobs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END)::BIGINT as failed_jobs,
        AVG(CASE WHEN processing_duration_ms IS NOT NULL THEN processing_duration_ms END) as avg_processing_time_ms,
        CASE 
            WHEN COUNT(CASE WHEN status IN ('completed', 'failed') THEN 1 END) > 0 
            THEN ROUND(
                COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / 
                COUNT(CASE WHEN status IN ('completed', 'failed') THEN 1 END) * 100, 
                2
            )
            ELSE 0 
        END as success_rate
    FROM public.lease_processing_jobs
    WHERE (user_uuid IS NULL OR user_id = user_uuid)
    AND created_at >= NOW() - INTERVAL '1 hour' * hours_back;
END;
$$ LANGUAGE plpgsql;

-- Create function to cleanup old completed jobs
CREATE OR REPLACE FUNCTION public.cleanup_old_lease_jobs(
    days_to_keep INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete completed jobs older than specified days
    DELETE FROM public.lease_processing_jobs
    WHERE status = 'completed'
    AND processing_completed_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update documents table when job completes
CREATE OR REPLACE FUNCTION public.sync_document_extraction_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the related document when job status changes
    IF NEW.status != OLD.status THEN
        UPDATE public.documents 
        SET 
            extraction_status = CASE 
                WHEN NEW.status = 'pending' THEN 'pending'
                WHEN NEW.status = 'processing' THEN 'processing'
                WHEN NEW.status = 'completed' THEN 'completed'
                WHEN NEW.status = 'failed' THEN 'failed'
                WHEN NEW.status = 'retrying' THEN 'processing'
                ELSE extraction_status
            END,
            extracted_text = CASE 
                WHEN NEW.status = 'completed' THEN NEW.extracted_text
                ELSE extracted_text
            END,
            lease_extraction = CASE 
                WHEN NEW.status = 'completed' THEN NEW.lease_analysis
                ELSE lease_extraction
            END,
            metadata = CASE 
                WHEN NEW.status = 'completed' THEN 
                    COALESCE(metadata, '{}'::jsonb) || 
                    jsonb_build_object(
                        'ocrSource', NEW.ocr_source,
                        'processingDuration', NEW.processing_duration_ms,
                        'processedAt', NEW.processing_completed_at
                    )
                ELSE metadata
            END,
            updated_at = NOW()
        WHERE id = NEW.document_id;
        
        -- Create lease extraction record if job completed successfully
        IF NEW.status = 'completed' AND NEW.lease_analysis IS NOT NULL THEN
            INSERT INTO public.lease_extractions (
                document_id,
                building_id,
                extracted_clauses,
                summary,
                confidence,
                metadata,
                extracted_by
            ) VALUES (
                NEW.document_id,
                NEW.building_id,
                NEW.lease_analysis->'clauses',
                NEW.lease_analysis->>'summary',
                COALESCE((NEW.lease_analysis->>'confidence')::DECIMAL, 0.8),
                jsonb_build_object(
                    'processingDuration', NEW.processing_duration_ms,
                    'ocrSource', NEW.ocr_source,
                    'fileSize', NEW.file_size,
                    'processedAt', NEW.processing_completed_at
                ),
                NEW.user_id
            )
            ON CONFLICT (document_id) DO UPDATE SET
                extracted_clauses = EXCLUDED.extracted_clauses,
                summary = EXCLUDED.summary,
                confidence = EXCLUDED.confidence,
                metadata = EXCLUDED.metadata,
                updated_at = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_sync_document_extraction ON public.lease_processing_jobs;
CREATE TRIGGER trigger_sync_document_extraction
    AFTER UPDATE ON public.lease_processing_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_document_extraction_status();

-- Add RLS policies
ALTER TABLE public.lease_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_processing_job_history ENABLE ROW LEVEL SECURITY;

-- Jobs table policies - users can only see their own jobs
CREATE POLICY "Users can view their own processing jobs" ON public.lease_processing_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processing jobs" ON public.lease_processing_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update all processing jobs" ON public.lease_processing_jobs
    FOR UPDATE USING (true); -- Allow system/background processes to update

-- Job history policies
CREATE POLICY "Users can view history for their jobs" ON public.lease_processing_job_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.lease_processing_jobs j 
            WHERE j.id = job_id AND j.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert job history" ON public.lease_processing_job_history
    FOR INSERT WITH CHECK (true); -- Allow system to insert history

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.lease_processing_jobs TO authenticated;
GRANT SELECT ON public.lease_processing_job_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_lease_job_status(UUID, TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_next_lease_processing_job() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_lease_processing_stats(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_lease_jobs(INTEGER) TO authenticated, anon;

-- Add helpful comments
COMMENT ON TABLE public.lease_processing_jobs IS 'Background job queue for asynchronous lease document processing';
COMMENT ON TABLE public.lease_processing_job_history IS 'Audit trail for lease processing job status changes';
COMMENT ON FUNCTION public.update_lease_job_status(UUID, TEXT, TEXT, TEXT) IS 'Updates job status with automatic history tracking';
COMMENT ON FUNCTION public.get_next_lease_processing_job() IS 'Gets the next pending job for background processing';
COMMENT ON FUNCTION public.get_lease_processing_stats(UUID, INTEGER) IS 'Returns processing statistics for monitoring';