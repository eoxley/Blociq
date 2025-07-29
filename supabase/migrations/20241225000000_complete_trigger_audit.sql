-- ========================================
-- COMPLETE DATABASE TRIGGER AUDIT & UPDATE
-- ========================================
-- This migration ensures all tables with updated_at columns have proper triggers
-- and reviews/updates existing triggers for optimal performance

-- ========================================
-- 1. ENSURE update_updated_at_column() FUNCTION EXISTS
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ========================================
-- 2. AUDIT AND ADD MISSING TRIGGERS
-- ========================================

-- Check and add trigger for major_works_projects
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_major_works_projects_updated_at'
    ) THEN
        CREATE TRIGGER update_major_works_projects_updated_at 
            BEFORE UPDATE ON major_works_projects 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Added trigger for major_works_projects';
    ELSE
        RAISE NOTICE 'Trigger already exists for major_works_projects';
    END IF;
END $$;

-- Check and add trigger for major_works_timeline_events
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_major_works_timeline_events_updated_at'
    ) THEN
        CREATE TRIGGER update_major_works_timeline_events_updated_at 
            BEFORE UPDATE ON major_works_timeline_events 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Added trigger for major_works_timeline_events';
    ELSE
        RAISE NOTICE 'Trigger already exists for major_works_timeline_events';
    END IF;
END $$;

-- Check and add trigger for communications_log (if table exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'communications_log'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'update_communications_log_updated_at'
        ) THEN
            CREATE TRIGGER update_communications_log_updated_at 
                BEFORE UPDATE ON communications_log 
                FOR EACH ROW 
                EXECUTE FUNCTION update_updated_at_column();
            RAISE NOTICE 'Added trigger for communications_log';
        ELSE
            RAISE NOTICE 'Trigger already exists for communications_log';
        END IF;
    ELSE
        RAISE NOTICE 'Table communications_log does not exist, skipping trigger';
    END IF;
END $$;

-- Check and add trigger for contractors
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_contractors_updated_at'
    ) THEN
        CREATE TRIGGER update_contractors_updated_at 
            BEFORE UPDATE ON contractors 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Added trigger for contractors';
    ELSE
        RAISE NOTICE 'Trigger already exists for contractors';
    END IF;
END $$;

-- Check and add trigger for compliance_contracts
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_compliance_contracts_updated_at'
    ) THEN
        CREATE TRIGGER update_compliance_contracts_updated_at 
            BEFORE UPDATE ON compliance_contracts 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Added trigger for compliance_contracts';
    ELSE
        RAISE NOTICE 'Trigger already exists for compliance_contracts';
    END IF;
END $$;

-- Check and add trigger for occupiers
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_occupiers_updated_at'
    ) THEN
        CREATE TRIGGER update_occupiers_updated_at 
            BEFORE UPDATE ON occupiers 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Added trigger for occupiers';
    ELSE
        RAISE NOTICE 'Trigger already exists for occupiers';
    END IF;
END $$;

-- Check and add trigger for diary_entries
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_diary_entries_updated_at'
    ) THEN
        CREATE TRIGGER update_diary_entries_updated_at 
            BEFORE UPDATE ON diary_entries 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Added trigger for diary_entries';
    ELSE
        RAISE NOTICE 'Trigger already exists for diary_entries';
    END IF;
END $$;

-- Check and add trigger for property_events
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_property_events_updated_at'
    ) THEN
        CREATE TRIGGER update_property_events_updated_at 
            BEFORE UPDATE ON property_events 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Added trigger for property_events';
    ELSE
        RAISE NOTICE 'Trigger already exists for property_events';
    END IF;
END $$;

-- Check and add trigger for major_works
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_major_works_updated_at'
    ) THEN
        CREATE TRIGGER update_major_works_updated_at 
            BEFORE UPDATE ON major_works 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Added trigger for major_works';
    ELSE
        RAISE NOTICE 'Trigger already exists for major_works';
    END IF;
END $$;

-- Check and add trigger for major_works_logs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_major_works_logs_updated_at'
    ) THEN
        CREATE TRIGGER update_major_works_logs_updated_at 
            BEFORE UPDATE ON major_works_logs 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Added trigger for major_works_logs';
    ELSE
        RAISE NOTICE 'Trigger already exists for major_works_logs';
    END IF;
END $$;

-- Check and add trigger for ai_logs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_ai_logs_updated_at'
    ) THEN
        CREATE TRIGGER update_ai_logs_updated_at 
            BEFORE UPDATE ON ai_logs 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Added trigger for ai_logs';
    ELSE
        RAISE NOTICE 'Trigger already exists for ai_logs';
    END IF;
END $$;

-- Check and add trigger for chat_history
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_chat_history_updated_at'
    ) THEN
        CREATE TRIGGER update_chat_history_updated_at 
            BEFORE UPDATE ON chat_history 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Added trigger for chat_history';
    ELSE
        RAISE NOTICE 'Trigger already exists for chat_history';
    END IF;
END $$;

-- Check and add trigger for document_analysis
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_document_analysis_updated_at'
    ) THEN
        CREATE TRIGGER update_document_analysis_updated_at 
            BEFORE UPDATE ON document_analysis 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Added trigger for document_analysis';
    ELSE
        RAISE NOTICE 'Trigger already exists for document_analysis';
    END IF;
END $$;

-- Check and add trigger for document_queries
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_document_queries_updated_at'
    ) THEN
        CREATE TRIGGER update_document_queries_updated_at 
            BEFORE UPDATE ON document_queries 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Added trigger for document_queries';
    ELSE
        RAISE NOTICE 'Trigger already exists for document_queries';
    END IF;
END $$;

-- Check and add trigger for building_amendments
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_building_amendments_updated_at'
    ) THEN
        CREATE TRIGGER update_building_amendments_updated_at 
            BEFORE UPDATE ON building_amendments 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Added trigger for building_amendments';
    ELSE
        RAISE NOTICE 'Trigger already exists for building_amendments';
    END IF;
END $$;

-- ========================================
-- 3. REVIEW AND UPDATE TEMPLATE USAGE STATS TRIGGER
-- ========================================

-- Create or update the template usage stats function
CREATE OR REPLACE FUNCTION update_template_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update usage count in communication_templates table
    UPDATE communication_templates 
    SET usage_count = COALESCE(usage_count, 0) + 1,
        last_used_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.template_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_template_usage_stats_trigger ON communications_log;

-- Create the trigger for template usage tracking
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'communications_log'
    ) THEN
        CREATE TRIGGER update_template_usage_stats_trigger
            AFTER INSERT ON communications_log
            FOR EACH ROW
            EXECUTE FUNCTION update_template_usage_stats();
        RAISE NOTICE 'Created template usage stats trigger';
    ELSE
        RAISE NOTICE 'Table communications_log does not exist, skipping template usage trigger';
    END IF;
END $$;

-- ========================================
-- 4. PERFORMANCE OPTIMIZATIONS
-- ========================================

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incoming_emails_outlook_message_id ON incoming_emails(outlook_message_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_updated_at ON incoming_emails(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_buildings_updated_at ON buildings(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_units_updated_at ON units(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaseholders_updated_at ON leaseholders(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_updated_at ON building_compliance_assets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_updated_at ON compliance_documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_building_documents_updated_at ON building_documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_major_works_projects_updated_at ON major_works_projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_major_works_timeline_events_updated_at ON major_works_timeline_events(updated_at DESC);

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_building_compliance_assets_building_status ON building_compliance_assets(building_id, status);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_building_asset ON compliance_documents(building_id, compliance_asset_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_building_handled ON incoming_emails(building_id, handled);

-- ========================================
-- 5. AUDIT SUMMARY
-- ========================================

-- Create a view to audit all triggers
CREATE OR REPLACE VIEW trigger_audit AS
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name,
    CASE t.tgtype & 66
        WHEN 2 THEN 'BEFORE'
        WHEN 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END as trigger_timing,
    CASE t.tgtype & 28
        WHEN 4 THEN 'INSERT'
        WHEN 8 THEN 'DELETE'
        WHEN 16 THEN 'UPDATE'
        WHEN 12 THEN 'INSERT OR DELETE'
        WHEN 20 THEN 'INSERT OR UPDATE'
        WHEN 24 THEN 'DELETE OR UPDATE'
        WHEN 28 THEN 'INSERT OR DELETE OR UPDATE'
    END as trigger_event
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgisinternal = false
ORDER BY c.relname, t.tgname;

-- Log audit results
DO $$
DECLARE
    trigger_count INTEGER;
    table_count INTEGER;
BEGIN
    -- Count triggers
    SELECT COUNT(*) INTO trigger_count FROM trigger_audit;
    
    -- Count tables with updated_at columns
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
    AND table_schema = 'public';
    
    RAISE NOTICE 'Trigger Audit Complete:';
    RAISE NOTICE '- Total triggers: %', trigger_count;
    RAISE NOTICE '- Tables with updated_at: %', table_count;
    RAISE NOTICE '- View trigger_audit for detailed breakdown';
END $$;