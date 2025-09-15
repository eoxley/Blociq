-- Database schema updates for Document Library and Lease Mode

-- Create building_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS building_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('compliance', 'leases', 'insurance', 'major_works', 'minutes', 'other')),
    document_type TEXT NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ocr_status TEXT NOT NULL DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}',
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leases table if it doesn't exist
CREATE TABLE IF NOT EXISTS leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    lease_start_date DATE NOT NULL,
    lease_end_date DATE NOT NULL,
    term_years INTEGER NOT NULL,
    ground_rent_amount DECIMAL(10,2) DEFAULT 0,
    ground_rent_frequency TEXT DEFAULT 'annually',
    service_charge_amount DECIMAL(10,2) DEFAULT 0,
    leaseholder_name TEXT NOT NULL,
    property_address TEXT NOT NULL,
    lease_type TEXT NOT NULL DEFAULT 'Residential Long Lease',
    restrictions TEXT[] DEFAULT '{}',
    responsibilities TEXT[] DEFAULT '{}',
    apportionments JSONB DEFAULT '{}',
    clauses JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    extracted_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) VALUES
    ('building-documents', 'building-documents', true),
    ('lease-documents', 'lease-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_building_documents_building_id ON building_documents(building_id);
CREATE INDEX IF NOT EXISTS idx_building_documents_category ON building_documents(category);
CREATE INDEX IF NOT EXISTS idx_building_documents_upload_date ON building_documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_leases_building_id ON leases(building_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_dates ON leases(lease_start_date, lease_end_date);

-- Add RLS policies for building_documents
ALTER TABLE building_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view building documents for their buildings" ON building_documents;
CREATE POLICY "Users can view building documents for their buildings"
ON building_documents FOR SELECT
USING (
    building_id IN (
        SELECT id FROM buildings WHERE id = building_id
    )
);

DROP POLICY IF EXISTS "Users can insert building documents for their buildings" ON building_documents;
CREATE POLICY "Users can insert building documents for their buildings"
ON building_documents FOR INSERT
WITH CHECK (
    building_id IN (
        SELECT id FROM buildings WHERE id = building_id
    )
);

DROP POLICY IF EXISTS "Users can update building documents for their buildings" ON building_documents;
CREATE POLICY "Users can update building documents for their buildings"
ON building_documents FOR UPDATE
USING (
    building_id IN (
        SELECT id FROM buildings WHERE id = building_id
    )
);

-- Add RLS policies for leases
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view leases for their buildings" ON leases;
CREATE POLICY "Users can view leases for their buildings"
ON leases FOR SELECT
USING (
    building_id IN (
        SELECT id FROM buildings WHERE id = building_id
    )
);

DROP POLICY IF EXISTS "Users can insert leases for their buildings" ON leases;
CREATE POLICY "Users can insert leases for their buildings"
ON leases FOR INSERT
WITH CHECK (
    building_id IN (
        SELECT id FROM buildings WHERE id = building_id
    )
);

DROP POLICY IF EXISTS "Users can update leases for their buildings" ON leases;
CREATE POLICY "Users can update leases for their buildings"
ON leases FOR UPDATE
USING (
    building_id IN (
        SELECT id FROM buildings WHERE id = building_id
    )
);

-- Storage policies for building-documents bucket
DROP POLICY IF EXISTS "Users can view building documents" ON storage.objects;
CREATE POLICY "Users can view building documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'building-documents');

DROP POLICY IF EXISTS "Users can upload building documents" ON storage.objects;
CREATE POLICY "Users can upload building documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'building-documents' AND auth.uid() IS NOT NULL);

-- Storage policies for lease-documents bucket
DROP POLICY IF EXISTS "Users can view lease documents" ON storage.objects;
CREATE POLICY "Users can view lease documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'lease-documents');

DROP POLICY IF EXISTS "Users can upload lease documents" ON storage.objects;
CREATE POLICY "Users can upload lease documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lease-documents' AND auth.uid() IS NOT NULL);