-- Create project_documents table
CREATE TABLE IF NOT EXISTS project_documents (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES major_works(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    filename TEXT NOT NULL,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('notice', 'estimate', 'quote', 'scope', 'minutes', 'approval', 'other')),
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_observations table
CREATE TABLE IF NOT EXISTS project_observations (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES major_works(id) ON DELETE CASCADE,
    phase TEXT NOT NULL CHECK (phase IN ('notice_intention', 'estimates')),
    observer_type TEXT NOT NULL CHECK (observer_type IN ('leaseholder', 'director', 'contractor', 'other')),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_doc_type ON project_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_project_documents_uploaded_at ON project_documents(uploaded_at);

CREATE INDEX IF NOT EXISTS idx_project_observations_project_id ON project_observations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_observations_phase ON project_observations(phase);
CREATE INDEX IF NOT EXISTS idx_project_observations_observer_type ON project_observations(observer_type);
CREATE INDEX IF NOT EXISTS idx_project_observations_created_at ON project_observations(created_at);

-- Add RLS policies for project_documents
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project documents" ON project_documents
    FOR SELECT USING (true);

CREATE POLICY "Users can insert project documents" ON project_documents
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update project documents" ON project_documents
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete project documents" ON project_documents
    FOR DELETE USING (true);

-- Add RLS policies for project_observations
ALTER TABLE project_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project observations" ON project_observations
    FOR SELECT USING (true);

CREATE POLICY "Users can insert project observations" ON project_observations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update project observations" ON project_observations
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete project observations" ON project_observations
    FOR DELETE USING (true);

-- Create storage bucket for project documents (if not exists)
-- Note: This needs to be run in Supabase dashboard or via API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('project-documents', 'project-documents', true);

-- Add storage policies for project-documents bucket
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'project-documents');
-- CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'project-documents' AND auth.role() = 'authenticated');
-- CREATE POLICY "Authenticated users can update" ON storage.objects FOR UPDATE USING (bucket_id = 'project-documents' AND auth.role() = 'authenticated');
-- CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE USING (bucket_id = 'project-documents' AND auth.role() = 'authenticated'); 