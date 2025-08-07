-- Create major_works_projects table and related tables
-- Create major_works_projects table
CREATE TABLE IF NOT EXISTS major_works_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'notice_of_intention' CHECK (
        status IN (
            'notice_of_intention',
            'statement_of_estimates',
            'contractor_appointed',
            'works_in_progress',
            'completed',
            'on_hold',
            'cancelled'
        )
    ),
    notice_of_intention_date DATE,
    statement_of_estimates_date DATE,
    contractor_appointed_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,
    estimated_cost DECIMAL(12,2),
    actual_cost DECIMAL(12,2),
    contractor_name TEXT,
    contractor_contact TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create major_works_documents table
CREATE TABLE IF NOT EXISTS major_works_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES major_works_projects(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    document_tag TEXT CHECK (
        document_tag IN (
            'scope',
            'quote',
            'notice',
            'correspondence',
            'contract',
            'invoice',
            'photo',
            'other'
        )
    ),
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

-- Create major_works_timeline_events table for custom milestones
CREATE TABLE IF NOT EXISTS major_works_timeline_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES major_works_projects(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    event_date DATE,
    event_type TEXT NOT NULL DEFAULT 'milestone' CHECK (
        event_type IN ('milestone', 'deadline', 'meeting', 'inspection')
    ),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_major_works_projects_building_id ON major_works_projects(building_id);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_status ON major_works_projects(status);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_created_at ON major_works_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_major_works_documents_project_id ON major_works_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_major_works_documents_building_id ON major_works_documents(building_id);
CREATE INDEX IF NOT EXISTS idx_major_works_documents_tag ON major_works_documents(document_tag);
CREATE INDEX IF NOT EXISTS idx_major_works_timeline_events_project_id ON major_works_timeline_events(project_id);

-- Enable Row Level Security (RLS)
ALTER TABLE major_works_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE major_works_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE major_works_timeline_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for major_works_projects
CREATE POLICY "Major works projects are viewable by authenticated users" ON major_works_projects
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Major works projects can be created by authenticated users" ON major_works_projects
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Major works projects can be updated by authenticated users" ON major_works_projects
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Major works projects can be deleted by authenticated users" ON major_works_projects
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for major_works_documents
CREATE POLICY "Major works documents are viewable by authenticated users" ON major_works_documents
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Major works documents can be created by authenticated users" ON major_works_documents
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Major works documents can be updated by authenticated users" ON major_works_documents
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Major works documents can be deleted by authenticated users" ON major_works_documents
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for major_works_timeline_events
CREATE POLICY "Major works timeline events are viewable by authenticated users" ON major_works_timeline_events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Major works timeline events can be created by authenticated users" ON major_works_timeline_events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Major works timeline events can be updated by authenticated users" ON major_works_timeline_events
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Major works timeline events can be deleted by authenticated users" ON major_works_timeline_events
    FOR DELETE USING (auth.role() = 'authenticated'); 