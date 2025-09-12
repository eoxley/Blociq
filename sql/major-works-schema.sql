-- ===================================
-- Major Works Projects Schema
-- ===================================
-- This creates the correct schema that matches the API endpoints
-- Fields align with CreateMajorWorksModal.tsx and /api/major-works/new/route.ts

-- Create the main major_works_projects table
CREATE TABLE IF NOT EXISTS public.major_works_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic project information
  title TEXT NOT NULL,
  description TEXT,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  
  -- Dates
  start_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Financial information
  estimated_cost DECIMAL(12,2),
  actual_cost DECIMAL(12,2) DEFAULT 0,
  budget_allocated DECIMAL(12,2) DEFAULT 0,
  
  -- Project management
  expected_duration INTEGER, -- duration in days
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'consulting', 'awaiting_contractor', 'in_progress', 'completed', 'on_hold')),
  project_type TEXT DEFAULT 'general' CHECK (project_type IN ('general', 'roofing', 'electrical', 'plumbing', 'structural', 'cosmetic')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Progress tracking
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  
  -- User tracking
  created_by UUID REFERENCES auth.users(id),
  
  -- Additional fields for extended functionality
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  stakeholders JSONB DEFAULT '[]'::jsonb,
  milestones JSONB DEFAULT '[]'::jsonb
);

-- Create major_works_logs table for timeline/activity tracking
CREATE TABLE IF NOT EXISTS public.major_works_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.major_works_projects(id) ON DELETE CASCADE,
  
  -- Log entry details
  action TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Legacy compatibility fields
  title TEXT GENERATED ALWAYS AS (action) STORED,
  notes TEXT GENERATED ALWAYS AS (description) STORED,
  created_by UUID GENERATED ALWAYS AS (user_id) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create major_works_documents table for document attachments
CREATE TABLE IF NOT EXISTS public.major_works_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.major_works_projects(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.building_documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Additional document metadata
  document_type TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Create major_works_milestones table for project milestones
CREATE TABLE IF NOT EXISTS public.major_works_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.major_works_projects(id) ON DELETE CASCADE,
  
  -- Milestone details
  label TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_date DATE,
  done BOOLEAN DEFAULT FALSE,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  completed_by UUID REFERENCES auth.users(id)
);

-- ===================================
-- INDEXES
-- ===================================

-- Main projects table indexes
CREATE INDEX IF NOT EXISTS idx_major_works_projects_building_id ON public.major_works_projects(building_id);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_status ON public.major_works_projects(status);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_priority ON public.major_works_projects(priority);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_created_at ON public.major_works_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_start_date ON public.major_works_projects(start_date);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_is_active ON public.major_works_projects(is_active);

-- Logs table indexes
CREATE INDEX IF NOT EXISTS idx_major_works_logs_project_id ON public.major_works_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_major_works_logs_timestamp ON public.major_works_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_major_works_logs_action ON public.major_works_logs(action);

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_major_works_documents_project_id ON public.major_works_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_major_works_documents_document_id ON public.major_works_documents(document_id);

-- Milestones table indexes
CREATE INDEX IF NOT EXISTS idx_major_works_milestones_project_id ON public.major_works_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_major_works_milestones_due_date ON public.major_works_milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_major_works_milestones_done ON public.major_works_milestones(done);

-- ===================================
-- ROW LEVEL SECURITY (RLS)
-- ===================================

-- Enable RLS on all tables
ALTER TABLE public.major_works_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.major_works_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.major_works_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.major_works_milestones ENABLE ROW LEVEL SECURITY;

-- Create RLS policies using the same agency-based access pattern as compliance assets
CREATE POLICY "Users can access major works projects for their agency buildings" 
ON public.major_works_projects 
FOR ALL 
USING (user_has_agency_building_access_uuid(building_id));

CREATE POLICY "Users can access major works logs for their agency projects" 
ON public.major_works_logs 
FOR ALL 
USING (
  project_id IN (
    SELECT id FROM public.major_works_projects 
    WHERE user_has_agency_building_access_uuid(building_id)
  )
);

CREATE POLICY "Users can access major works documents for their agency projects" 
ON public.major_works_documents 
FOR ALL 
USING (
  project_id IN (
    SELECT id FROM public.major_works_projects 
    WHERE user_has_agency_building_access_uuid(building_id)
  )
);

CREATE POLICY "Users can access major works milestones for their agency projects" 
ON public.major_works_milestones 
FOR ALL 
USING (
  project_id IN (
    SELECT id FROM public.major_works_projects 
    WHERE user_has_agency_building_access_uuid(building_id)
  )
);

-- ===================================
-- UPDATE TRIGGERS
-- ===================================

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to projects table
CREATE TRIGGER update_major_works_projects_updated_at 
  BEFORE UPDATE ON public.major_works_projects 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Apply the trigger to logs table
CREATE TRIGGER update_major_works_logs_updated_at 
  BEFORE UPDATE ON public.major_works_logs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- COMMENTS FOR DOCUMENTATION
-- ===================================

COMMENT ON TABLE public.major_works_projects IS 'Main table for tracking major works projects (Section 20 consultations, building works, etc.)';
COMMENT ON COLUMN public.major_works_projects.status IS 'Project status: planning, consulting, awaiting_contractor, in_progress, completed, on_hold';
COMMENT ON COLUMN public.major_works_projects.project_type IS 'Type of work: general, roofing, electrical, plumbing, structural, cosmetic';
COMMENT ON COLUMN public.major_works_projects.priority IS 'Priority level: low, medium, high, critical';
COMMENT ON COLUMN public.major_works_projects.expected_duration IS 'Expected project duration in days';
COMMENT ON COLUMN public.major_works_projects.completion_percentage IS 'Project completion percentage (0-100)';

COMMENT ON TABLE public.major_works_logs IS 'Activity log and timeline entries for major works projects';
COMMENT ON COLUMN public.major_works_logs.action IS 'Type of action logged (e.g., project_created, status_changed, document_uploaded)';
COMMENT ON COLUMN public.major_works_logs.metadata IS 'Additional structured data related to the log entry';

COMMENT ON TABLE public.major_works_documents IS 'Links major works projects to building documents';
COMMENT ON TABLE public.major_works_milestones IS 'Project milestones and deadlines for major works projects';

-- ===================================
-- VERIFY TABLES EXIST
-- ===================================

-- List all major works tables
SELECT tablename, schemaname 
FROM pg_tables 
WHERE tablename LIKE 'major_works%' 
ORDER BY tablename;