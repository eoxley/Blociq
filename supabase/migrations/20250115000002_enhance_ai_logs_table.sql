-- ========================================
-- ENHANCE AI_LOGS TABLE
-- Date: 2025-01-15
-- Description: Add missing columns to ai_logs table for better context tracking
-- ========================================

-- Add missing columns to ai_logs table
ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS response TEXT;
ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS building_name VARCHAR(255);
ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS document_count INTEGER DEFAULT 0;
ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS context_type VARCHAR(100) DEFAULT 'general';
ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS context_id VARCHAR(255);
ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS leaseholder_id UUID;
ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS leaseholder_name VARCHAR(255);
ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS unit_number VARCHAR(50);
ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS unit_count INTEGER;
ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_logs_context_type ON ai_logs(context_type);
CREATE INDEX IF NOT EXISTS idx_ai_logs_context_id ON ai_logs(context_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_building_id ON ai_logs(building_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_leaseholder_id ON ai_logs(leaseholder_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_unit_count ON ai_logs(unit_count);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at);

-- Add comments for documentation
COMMENT ON COLUMN ai_logs.context_type IS 'Type of context (building, major-works, compliance, general, etc.)';
COMMENT ON COLUMN ai_logs.context_id IS 'ID of the specific context (building ID, major works ID, etc.)';
COMMENT ON COLUMN ai_logs.unit_count IS 'Number of units in the building being discussed';
COMMENT ON COLUMN ai_logs.metadata IS 'Additional metadata as JSON (documents, brain_button_usage, etc.)'; 