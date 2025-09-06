-- Create document_jobs table for Lease Lab
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
  extracted_json jsonb,
  summary_json jsonb,
  token_usage integer,
  latency_ms integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  CONSTRAINT document_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT document_jobs_status_check CHECK (status IN ('QUEUED', 'OCR', 'EXTRACT', 'SUMMARISE', 'READY', 'FAILED')),
  CONSTRAINT document_jobs_linked_building_id_fkey FOREIGN KEY (linked_building_id) REFERENCES public.buildings(id) ON DELETE SET NULL,
  CONSTRAINT document_jobs_linked_unit_id_fkey FOREIGN KEY (linked_unit_id) REFERENCES public.units(id) ON DELETE SET NULL,
  CONSTRAINT document_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT document_jobs_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_jobs_agency_id ON public.document_jobs USING btree (agency_id);
CREATE INDEX IF NOT EXISTS idx_document_jobs_user_id ON public.document_jobs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_document_jobs_status ON public.document_jobs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_document_jobs_created_at ON public.document_jobs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_jobs_linked_building_id ON public.document_jobs USING btree (linked_building_id);
CREATE INDEX IF NOT EXISTS idx_document_jobs_linked_unit_id ON public.document_jobs USING btree (linked_unit_id);

-- Create trigger for updated_at
CREATE TRIGGER update_document_jobs_updated_at
  BEFORE UPDATE ON public.document_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.document_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view jobs from their agency" ON public.document_jobs
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create jobs in their agency" ON public.document_jobs
  FOR INSERT WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.agency_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update jobs from their agency" ON public.document_jobs
  FOR UPDATE USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete jobs from their agency" ON public.document_jobs
  FOR DELETE USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_members 
      WHERE user_id = auth.uid()
    )
  );
