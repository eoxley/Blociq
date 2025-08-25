-- Industry Knowledge Library Database Setup
-- This creates the necessary tables for storing industry knowledge PDFs and their AI embeddings

-- 1. Industry Knowledge Documents Table
CREATE TABLE IF NOT EXISTS industry_knowledge_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    tags TEXT[],
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(50) DEFAULT 'pdf',
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_processed TIMESTAMP WITH TIME ZONE,
    processing_status VARCHAR(50) DEFAULT 'pending',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Document Chunks Table (for embedding storage)
CREATE TABLE IF NOT EXISTS industry_knowledge_chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES industry_knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_embedding VECTOR(1536), -- OpenAI embedding dimension
    page_number INTEGER,
    section_title VARCHAR(500),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Knowledge Categories Table
CREATE TABLE IF NOT EXISTS industry_knowledge_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES industry_knowledge_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Document Processing Logs
CREATE TABLE IF NOT EXISTS industry_knowledge_processing_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES industry_knowledge_documents(id) ON DELETE CASCADE,
    processing_step VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Knowledge Usage Analytics
CREATE TABLE IF NOT EXISTS industry_knowledge_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_text TEXT NOT NULL,
    relevant_documents TEXT[],
    response_accuracy_rating INTEGER CHECK (response_accuracy_rating >= 1 AND response_accuracy_rating <= 5),
    user_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_industry_knowledge_documents_category ON industry_knowledge_documents(category);
CREATE INDEX IF NOT EXISTS idx_industry_knowledge_documents_status ON industry_knowledge_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_industry_knowledge_chunks_document_id ON industry_knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_industry_knowledge_chunks_embedding ON industry_knowledge_chunks USING ivfflat (chunk_embedding vector_cosine_ops);

-- Insert default categories
INSERT INTO industry_knowledge_categories (name, description, sort_order) VALUES
('Compliance & Regulations', 'Building safety, fire regulations, and compliance requirements', 1),
('Property Management', 'General property management best practices and procedures', 2),
('Health & Safety', 'Health and safety guidelines and procedures', 3),
('Maintenance & Repairs', 'Building maintenance, repairs, and contractor management', 4),
('Leaseholder Relations', 'Tenant communication, rights, and dispute resolution', 5),
('Financial Management', 'Budgeting, service charges, and financial compliance', 6),
('Emergency Procedures', 'Emergency response and crisis management', 7),
('Legal & Contracts', 'Legal requirements, contracts, and documentation', 8)
ON CONFLICT (name) DO NOTHING;

-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_industry_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_industry_knowledge_updated_at
    BEFORE UPDATE ON industry_knowledge_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_industry_knowledge_updated_at();

-- Grant permissions (adjust as needed for your setup)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
