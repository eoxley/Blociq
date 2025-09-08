-- Create document_jobs table
CREATE TABLE IF NOT EXISTS public.document_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  filename character varying(255) NOT NULL,
  status character varying(50) NOT NULL DEFAULT 'QUEUED',
  size_bytes integer NOT NULL,
  mime character varying(100) NOT NULL,
  page_count integer,
  doc_type_guess character varying(100),
  linked_building_id uuid,
  linked_unit_id uuid,
  error_code character varying(100),
  error_message text,
  ocr_artifact_url text,
  extracted_text text,
  extracted_json jsonb,
  summary_json jsonb,
  token_usage integer,
  latency_ms integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL,
  agency_id uuid,
  CONSTRAINT document_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT document_jobs_status_check CHECK (status IN ('QUEUED', 'OCR', 'EXTRACT', 'SUMMARISE', 'READY', 'FAILED'))
);

-- Enable RLS
ALTER TABLE public.document_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own document jobs"
ON public.document_jobs
FOR SELECT
USING (
  user_id = (
    current_setting('request.jwt.claims', true)::json->>'sub'
  )::uuid
);

CREATE POLICY "Users can insert their own document jobs"
ON public.document_jobs
FOR INSERT
WITH CHECK (
  user_id = (
    current_setting('request.jwt.claims', true)::json->>'sub'
  )::uuid
);

CREATE POLICY "Users can update their own document jobs"
ON public.document_jobs
FOR UPDATE
USING (
  user_id = (
    current_setting('request.jwt.claims', true)::json->>'sub'
  )::uuid
);

-- Add foreign key constraints
ALTER TABLE public.document_jobs
ADD CONSTRAINT document_jobs_linked_building_id_fkey
FOREIGN KEY (linked_building_id) REFERENCES public.buildings(id) ON DELETE SET NULL;

ALTER TABLE public.document_jobs
ADD CONSTRAINT document_jobs_linked_unit_id_fkey
FOREIGN KEY (linked_unit_id) REFERENCES public.units(id) ON DELETE SET NULL;

ALTER TABLE public.document_jobs
ADD CONSTRAINT document_jobs_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.document_jobs
ADD CONSTRAINT document_jobs_agency_id_fkey
FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_jobs_agency_id ON public.document_jobs USING btree (agency_id);
CREATE INDEX IF NOT EXISTS idx_document_jobs_user_id ON public.document_jobs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_document_jobs_status ON public.document_jobs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_document_jobs_created_at ON public.document_jobs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_jobs_linked_building_id ON public.document_jobs USING btree (linked_building_id);
CREATE INDEX IF NOT EXISTS idx_document_jobs_linked_unit_id ON public.document_jobs USING btree (linked_unit_id);
