-- Migration to rename compliance tables to industry tables
-- This reflects the broader scope of the system beyond just compliance

-- Rename tables
ALTER TABLE IF EXISTS compliance_guidance RENAME TO industry_guidance;
ALTER TABLE IF EXISTS compliance_standards RENAME TO industry_standards;

-- Update indexes
DROP INDEX IF EXISTS idx_compliance_guidance_category;
DROP INDEX IF EXISTS idx_compliance_guidance_relevance;
DROP INDEX IF EXISTS idx_compliance_guidance_tags;
DROP INDEX IF EXISTS idx_compliance_standards_category;
DROP INDEX IF EXISTS idx_compliance_standards_name;

-- Recreate indexes with new names
CREATE INDEX IF NOT EXISTS idx_industry_guidance_category ON industry_guidance(category);
CREATE INDEX IF NOT EXISTS idx_industry_guidance_relevance ON industry_guidance(relevance_score);
CREATE INDEX IF NOT EXISTS idx_industry_guidance_tags ON industry_guidance USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_industry_standards_category ON industry_standards(category);
CREATE INDEX IF NOT EXISTS idx_industry_standards_name ON industry_standards(name);

-- Update RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to read compliance guidance" ON industry_guidance;
DROP POLICY IF EXISTS "Allow authenticated users to read compliance standards" ON industry_standards;

CREATE POLICY "Allow authenticated users to read industry guidance" ON industry_guidance
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read industry standards" ON industry_standards
  FOR SELECT USING (auth.role() = 'authenticated');

-- Update triggers
DROP TRIGGER IF EXISTS update_compliance_guidance_updated_at ON industry_guidance;
DROP TRIGGER IF EXISTS update_compliance_standards_updated_at ON industry_standards;

CREATE TRIGGER update_industry_guidance_updated_at 
    BEFORE UPDATE ON industry_guidance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_industry_standards_updated_at 
    BEFORE UPDATE ON industry_standards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update view
DROP VIEW IF EXISTS compliance_knowledge_summary;
CREATE OR REPLACE VIEW industry_knowledge_summary AS
SELECT 
  'guidance' as type,
  id,
  category,
  title,
  description,
  source,
  version,
  relevance_score,
  tags,
  created_at,
  updated_at
FROM industry_guidance
UNION ALL
SELECT 
  'standard' as type,
  id,
  category,
  name as title,
  description,
  'Regulation' as source,
  'Current' as version,
  100 as relevance_score,
  ARRAY[category] as tags,
  created_at,
  updated_at
FROM industry_standards;

-- Grant access to the new view
GRANT SELECT ON industry_knowledge_summary TO authenticated;

-- Add new industry categories for broader scope
INSERT INTO industry_standards (name, category, description, requirements, frequency, legal_basis, guidance_notes) VALUES
-- Property Management Standards
('RICS Service Charge Code', 'Property Management', 'RICS Service Charge Residential Management Code', 
  ARRAY['Transparent accounting', 'Regular reporting', 'Consultation procedures', 'Dispute resolution'], 
  'Annual review', 'RICS Professional Standards', 'Industry best practice for service charge management'),
  
('TPI Consumer Charter', 'Property Management', 'The Property Institute Consumer Charter & Standards', 
  ARRAY['Client communication', 'Service delivery', 'Complaints handling', 'Professional conduct'], 
  'Annual review', 'TPI Professional Standards', 'Industry standards for property management'),

-- Market Knowledge
('UK Property Market Trends', 'Market Knowledge', 'Current trends in UK property management', 
  ARRAY['Market analysis', 'Trend monitoring', 'Strategic planning', 'Risk assessment'], 
  'Quarterly review', 'Industry Research', 'Market intelligence for strategic decision making'),
  
('Leasehold Reform Updates', 'Market Knowledge', 'Latest developments in leasehold reform', 
  ARRAY['Legislation monitoring', 'Policy updates', 'Implementation guidance', 'Impact assessment'], 
  'Monthly review', 'Government Updates', 'Stay current with leasehold reform developments')

ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  requirements = EXCLUDED.requirements,
  frequency = EXCLUDED.frequency,
  legal_basis = EXCLUDED.legal_basis,
  guidance_notes = EXCLUDED.guidance_notes,
  updated_at = NOW();

-- Add industry guidance documents
INSERT INTO industry_guidance (category, title, description, content, source, version, relevance_score, tags) VALUES
('Property Management', 'Block Management Best Practices Guide', 
  'Comprehensive guide to effective block management operations',
  'Effective block management requires a systematic approach to operations, communication, and compliance. Key areas include: regular building inspections, proactive maintenance planning, transparent financial management, and effective resident communication. Best practices suggest monthly site visits, quarterly financial reports, and annual resident meetings.',
  'Industry Best Practice', '2024', 95, ARRAY['block management', 'best practices', 'operations', 'communication']),
  
('Market Knowledge', 'Property Management Technology Trends', 
  'Overview of emerging technologies in property management',
  'Technology is transforming property management through digital platforms, IoT sensors, and AI-powered tools. Key trends include: smart building systems, digital communication platforms, automated compliance monitoring, and data-driven decision making. These technologies improve efficiency, reduce costs, and enhance resident satisfaction.',
  'Industry Research', '2024', 90, ARRAY['technology', 'innovation', 'digital transformation', 'smart buildings'])

ON CONFLICT (title) DO UPDATE SET
  description = EXCLUDED.description,
  content = EXCLUDED.content,
  source = EXCLUDED.source,
  version = EXCLUDED.version,
  relevance_score = EXCLUDED.relevance_score,
  tags = EXCLUDED.tags,
  updated_at = NOW();
