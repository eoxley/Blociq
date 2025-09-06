-- Create view for fast Ask BlocIQ queries on lease summaries
-- This view extracts key fields from document_jobs.summary_json for efficient querying

CREATE OR REPLACE VIEW lease_summaries_v AS
SELECT 
  dj.id as job_id,
  dj.agency_id,
  dj.user_id,
  dj.filename,
  dj.created_at,
  dj.status,
  
  -- Extract basic document info
  (dj.summary_json->>'doc_type')::text as doc_type,
  (dj.summary_json->>'normalised_building_name')::text as building_name,
  (dj.summary_json->>'contract_version')::text as contract_version,
  
  -- Extract parties (first landlord and leaseholder for quick access)
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'role', party->>'role',
        'name', party->>'name'
      )
    )
    FROM jsonb_array_elements(dj.summary_json->'parties') as party
    WHERE party->>'role' IN ('landlord', 'leaseholder')
  ) as key_parties,
  
  -- Extract term information
  dj.summary_json->'term' as term_info,
  
  -- Extract financials
  dj.summary_json->'financials' as financials,
  
  -- Extract premises info
  dj.summary_json->'premises' as premises,
  
  -- Extract repair matrix (for responsibility queries)
  dj.summary_json->'repair_matrix' as repair_matrix,
  
  -- Extract use restrictions (for permission queries)
  dj.summary_json->'use_restrictions' as use_restrictions,
  
  -- Extract section 20 info
  dj.summary_json->'section20' as section20,
  
  -- Extract clause index (for clause lookups)
  dj.summary_json->'clause_index' as clause_index,
  
  -- Extract actions (for follow-up tasks)
  dj.summary_json->'actions' as actions,
  
  -- Extract unknowns (for safe responses)
  dj.summary_json->'unknowns' as unknowns,
  
  -- Full summary for complex queries
  dj.summary_json as full_summary,
  
  -- Building and unit linkage
  dj.linked_building_id,
  dj.linked_unit_id

FROM document_jobs dj
WHERE dj.status = 'READY'
  AND dj.summary_json IS NOT NULL
  AND (dj.summary_json->>'doc_type')::text IN ('lease', 'scope', 'assessment', 'report');

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_lease_summaries_building_name 
ON document_jobs USING gin ((summary_json->>'normalised_building_name'));

CREATE INDEX IF NOT EXISTS idx_lease_summaries_doc_type 
ON document_jobs ((summary_json->>'doc_type'));

CREATE INDEX IF NOT EXISTS idx_lease_summaries_linked_building 
ON document_jobs (linked_building_id) WHERE linked_building_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lease_summaries_linked_unit 
ON document_jobs (linked_unit_id) WHERE linked_unit_id IS NOT NULL;

-- Create GIN index for clause index searches
CREATE INDEX IF NOT EXISTS idx_lease_summaries_clause_index 
ON document_jobs USING gin ((summary_json->'clause_index'));

-- Create GIN index for repair matrix searches
CREATE INDEX IF NOT EXISTS idx_lease_summaries_repair_matrix 
ON document_jobs USING gin ((summary_json->'repair_matrix'));

-- Create GIN index for use restrictions searches
CREATE INDEX IF NOT EXISTS idx_lease_summaries_use_restrictions 
ON document_jobs USING gin ((summary_json->'use_restrictions'));

-- Grant access to authenticated users
GRANT SELECT ON lease_summaries_v TO authenticated;

-- Add RLS policy for agency-scoped access
ALTER VIEW lease_summaries_v SET (security_invoker = true);

-- Create function to get lease summary by building
CREATE OR REPLACE FUNCTION get_lease_summary_for_building(building_name_param text)
RETURNS TABLE (
  job_id uuid,
  building_name text,
  doc_type text,
  key_parties jsonb,
  term_info jsonb,
  financials jsonb,
  premises jsonb,
  repair_matrix jsonb,
  use_restrictions jsonb,
  section20 jsonb,
  clause_index jsonb,
  actions jsonb,
  unknowns jsonb
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    ls.job_id,
    ls.building_name,
    ls.doc_type,
    ls.key_parties,
    ls.term_info,
    ls.financials,
    ls.premises,
    ls.repair_matrix,
    ls.use_restrictions,
    ls.section20,
    ls.clause_index,
    ls.actions,
    ls.unknowns
  FROM lease_summaries_v ls
  WHERE ls.building_name ILIKE '%' || building_name_param || '%'
    AND ls.doc_type = 'lease'
  ORDER BY ls.created_at DESC
  LIMIT 1;
$$;

-- Create function to search clauses by topic
CREATE OR REPLACE FUNCTION search_clauses_by_topic(
  building_name_param text,
  topic_param text
)
RETURNS TABLE (
  job_id uuid,
  building_name text,
  clause_id text,
  heading text,
  normalized_topic text,
  text_excerpt text,
  pages jsonb
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    ls.job_id,
    ls.building_name,
    clause->>'id' as clause_id,
    clause->>'heading' as heading,
    clause->>'normalized_topic' as normalized_topic,
    clause->>'text_excerpt' as text_excerpt,
    clause->'pages' as pages
  FROM lease_summaries_v ls,
       jsonb_array_elements(ls.clause_index) as clause
  WHERE ls.building_name ILIKE '%' || building_name_param || '%'
    AND ls.doc_type = 'lease'
    AND (clause->>'normalized_topic' ILIKE '%' || topic_param || '%'
         OR clause->>'heading' ILIKE '%' || topic_param || '%')
  ORDER BY ls.created_at DESC;
$$;

-- Create function to get repair responsibilities
CREATE OR REPLACE FUNCTION get_repair_responsibilities(
  building_name_param text,
  item_param text DEFAULT NULL
)
RETURNS TABLE (
  job_id uuid,
  building_name text,
  item text,
  responsible text,
  notes text,
  source_page integer
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    ls.job_id,
    ls.building_name,
    repair->>'item' as item,
    repair->>'responsible' as responsible,
    repair->>'notes' as notes,
    (repair->'source'->>'page')::integer as source_page
  FROM lease_summaries_v ls,
       jsonb_array_elements(ls.repair_matrix) as repair
  WHERE ls.building_name ILIKE '%' || building_name_param || '%'
    AND ls.doc_type = 'lease'
    AND (item_param IS NULL OR repair->>'item' ILIKE '%' || item_param || '%')
  ORDER BY ls.created_at DESC;
$$;

-- Create function to get use restrictions
CREATE OR REPLACE FUNCTION get_use_restrictions(
  building_name_param text,
  topic_param text DEFAULT NULL
)
RETURNS TABLE (
  job_id uuid,
  building_name text,
  topic text,
  rule text,
  conditions text,
  source_page integer
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    ls.job_id,
    ls.building_name,
    restriction->>'topic' as topic,
    restriction->>'rule' as rule,
    restriction->>'conditions' as conditions,
    (restriction->'source'->>'page')::integer as source_page
  FROM lease_summaries_v ls,
       jsonb_array_elements(ls.use_restrictions) as restriction
  WHERE ls.building_name ILIKE '%' || building_name_param || '%'
    AND ls.doc_type = 'lease'
    AND (topic_param IS NULL OR restriction->>'topic' ILIKE '%' || topic_param || '%')
  ORDER BY ls.created_at DESC;
$$;
