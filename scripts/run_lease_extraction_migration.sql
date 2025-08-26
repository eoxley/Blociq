-- Simplified Lease Extraction Migration
-- Run this script manually if the main migration fails

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Step 2: Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT,
    building_id UUID,
    document_type TEXT DEFAULT 'unknown',
    uploaded_by UUID,
    extraction_status TEXT DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
    extracted_text TEXT,
    lease_extraction JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create lease_extractions table
CREATE TABLE IF NOT EXISTS public.lease_extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL,
    building_id UUID,
    extracted_clauses JSONB NOT NULL,
    summary TEXT,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    metadata JSONB DEFAULT '{}',
    extracted_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Add foreign key constraints (only if tables exist)
DO $$
BEGIN
    -- Add building_id foreign key if buildings table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'buildings' AND table_schema = 'public') THEN
        ALTER TABLE public.documents ADD CONSTRAINT fk_documents_building_id 
            FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE SET NULL;
        ALTER TABLE public.lease_extractions ADD CONSTRAINT fk_lease_extractions_building_id 
            FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE SET NULL;
    END IF;
    
    -- Add uploaded_by foreign key if auth.users table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'auth') THEN
        ALTER TABLE public.documents ADD CONSTRAINT fk_documents_uploaded_by 
            FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE;
        ALTER TABLE public.lease_extractions ADD CONSTRAINT fk_lease_extractions_extracted_by 
            FOREIGN KEY (extracted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    -- Add document_id foreign key
    ALTER TABLE public.lease_extractions ADD CONSTRAINT fk_lease_extractions_document_id 
        FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;
END $$;

-- Step 5: Create basic indexes
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_building_id ON public.documents(building_id);
CREATE INDEX IF NOT EXISTS idx_documents_extraction_status ON public.documents(extraction_status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_lease_metadata ON public.documents USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_lease_extractions_document_id ON public.lease_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_lease_extractions_building_id ON public.lease_extractions(building_id);
CREATE INDEX IF NOT EXISTS idx_lease_extractions_extracted_by ON public.lease_extractions(extracted_by);
CREATE INDEX IF NOT EXISTS idx_lease_extractions_confidence ON public.lease_extractions(confidence);

-- Step 6: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lease_extractions TO authenticated;

-- Step 7: Verify tables were created
SELECT 
    'documents' as table_name,
    COUNT(*) as row_count
FROM public.documents
UNION ALL
SELECT 
    'lease_extractions' as table_name,
    COUNT(*) as row_count
FROM public.lease_extractions;
