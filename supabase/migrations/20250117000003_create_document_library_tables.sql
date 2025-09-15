-- Create building_documents table for Document Library
CREATE TABLE IF NOT EXISTS building_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('compliance', 'leases', 'insurance', 'major_works', 'minutes', 'other')),
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by TEXT NOT NULL,
  ocr_status TEXT DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
  ocr_text TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leases table for Lease Mode
CREATE TABLE IF NOT EXISTS leases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  leaseholder_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated')),
  ground_rent TEXT NOT NULL,
  service_charge_percentage DECIMAL(5,2) NOT NULL,
  responsibilities TEXT[] DEFAULT '{}',
  restrictions TEXT[] DEFAULT '{}',
  rights TEXT[] DEFAULT '{}',
  file_path TEXT NOT NULL,
  ocr_text TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_building_documents_building_id ON building_documents(building_id);
CREATE INDEX IF NOT EXISTS idx_building_documents_category ON building_documents(category);
CREATE INDEX IF NOT EXISTS idx_building_documents_uploaded_at ON building_documents(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_building_documents_name ON building_documents USING gin(to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_leases_building_id ON leases(building_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit_number ON leases(unit_number);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_leaseholder_name ON leases USING gin(to_tsvector('english', leaseholder_name));

-- Create RLS policies
ALTER TABLE building_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

-- RLS policies for building_documents
CREATE POLICY "Users can view building documents for their buildings" ON building_documents
  FOR SELECT USING (
    building_id IN (
      SELECT id FROM buildings WHERE id IN (
        SELECT building_id FROM user_buildings WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert building documents for their buildings" ON building_documents
  FOR INSERT WITH CHECK (
    building_id IN (
      SELECT id FROM buildings WHERE id IN (
        SELECT building_id FROM user_buildings WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update building documents for their buildings" ON building_documents
  FOR UPDATE USING (
    building_id IN (
      SELECT id FROM buildings WHERE id IN (
        SELECT building_id FROM user_buildings WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete building documents for their buildings" ON building_documents
  FOR DELETE USING (
    building_id IN (
      SELECT id FROM buildings WHERE id IN (
        SELECT building_id FROM user_buildings WHERE user_id = auth.uid()
      )
    )
  );

-- RLS policies for leases
CREATE POLICY "Users can view leases for their buildings" ON leases
  FOR SELECT USING (
    building_id IN (
      SELECT id FROM buildings WHERE id IN (
        SELECT building_id FROM user_buildings WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert leases for their buildings" ON leases
  FOR INSERT WITH CHECK (
    building_id IN (
      SELECT id FROM buildings WHERE id IN (
        SELECT building_id FROM user_buildings WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update leases for their buildings" ON leases
  FOR UPDATE USING (
    building_id IN (
      SELECT id FROM buildings WHERE id IN (
        SELECT building_id FROM user_buildings WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete leases for their buildings" ON leases
  FOR DELETE USING (
    building_id IN (
      SELECT id FROM buildings WHERE id IN (
        SELECT building_id FROM user_buildings WHERE user_id = auth.uid()
      )
    )
  );

-- Create functions for document stats
CREATE OR REPLACE FUNCTION get_document_stats()
RETURNS TABLE (
  total_documents BIGINT,
  recent_uploads BIGINT,
  processing BIGINT,
  ready BIGINT,
  failed BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_documents,
    COUNT(*) FILTER (WHERE uploaded_at > NOW() - INTERVAL '7 days') as recent_uploads,
    COUNT(*) FILTER (WHERE ocr_status = 'processing') as processing,
    COUNT(*) FILTER (WHERE ocr_status = 'completed') as ready,
    COUNT(*) FILTER (WHERE ocr_status = 'failed') as failed
  FROM building_documents;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for building document counts
CREATE OR REPLACE FUNCTION get_building_document_counts()
RETURNS TABLE (
  building_id UUID,
  building_name TEXT,
  document_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as building_id,
    b.name as building_name,
    COUNT(bd.id) as document_count
  FROM buildings b
  LEFT JOIN building_documents bd ON b.id = bd.building_id
  GROUP BY b.id, b.name
  ORDER BY document_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Create storage policies
CREATE POLICY "Users can view documents for their buildings" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = 'buildings' AND
    (storage.foldername(name))[2]::uuid IN (
      SELECT id FROM buildings WHERE id IN (
        SELECT building_id FROM user_buildings WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can upload documents for their buildings" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = 'buildings' AND
    (storage.foldername(name))[2]::uuid IN (
      SELECT id FROM buildings WHERE id IN (
        SELECT building_id FROM user_buildings WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update documents for their buildings" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = 'buildings' AND
    (storage.foldername(name))[2]::uuid IN (
      SELECT id FROM buildings WHERE id IN (
        SELECT building_id FROM user_buildings WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete documents for their buildings" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = 'buildings' AND
    (storage.foldername(name))[2]::uuid IN (
      SELECT id FROM buildings WHERE id IN (
        SELECT building_id FROM user_buildings WHERE user_id = auth.uid()
      )
    )
  );
