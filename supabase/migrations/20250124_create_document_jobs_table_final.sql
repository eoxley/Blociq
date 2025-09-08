-- Create document_jobs table for lease lab processing
CREATE TABLE IF NOT EXISTS public.document_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  filename text NOT NULL,
  status text NOT NULL DEFAULT 'QUEUED',
  size_bytes bigint,
  mime text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  linked_building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL,
  linked_unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  extracted_text text,
  summary_json jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own jobs" ON public.document_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" ON public.document_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON public.document_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_jobs_user_id ON public.document_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_document_jobs_agency_id ON public.document_jobs(agency_id);
CREATE INDEX IF NOT EXISTS idx_document_jobs_status ON public.document_jobs(status);
CREATE INDEX IF NOT EXISTS idx_document_jobs_created_at ON public.document_jobs(created_at);
