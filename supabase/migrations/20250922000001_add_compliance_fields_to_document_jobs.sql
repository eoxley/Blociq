-- Add compliance-specific fields to document_jobs table
ALTER TABLE public.document_jobs
ADD COLUMN IF NOT EXISTS building_id integer,
ADD COLUMN IF NOT EXISTS asset_id integer,
ADD COLUMN IF NOT EXISTS document_type text,
ADD COLUMN IF NOT EXISTS error_message text;