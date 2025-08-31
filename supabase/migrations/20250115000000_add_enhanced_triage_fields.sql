-- Add enhanced triage fields to incoming_emails table
-- Date: January 15, 2025

-- Add new columns for enhanced triage functionality
ALTER TABLE incoming_emails 
ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(20) DEFAULT 'low' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS urgency_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mentioned_properties TEXT[],
ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS suggested_actions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS triage_category VARCHAR(100),
ADD COLUMN IF NOT EXISTS ai_tag VARCHAR(100);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_incoming_emails_urgency_level ON incoming_emails(urgency_level);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_urgency_score ON incoming_emails(urgency_score DESC);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_ai_tag ON incoming_emails(ai_tag);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_triage_category ON incoming_emails(triage_category);

-- Add comments for clarity
COMMENT ON COLUMN incoming_emails.urgency_level IS 'AI-detected urgency level: low, medium, high, critical';
COMMENT ON COLUMN incoming_emails.urgency_score IS 'Numeric urgency score (0-15) for fine-grained sorting';
COMMENT ON COLUMN incoming_emails.mentioned_properties IS 'Array of property names/addresses extracted from email content';
COMMENT ON COLUMN incoming_emails.ai_insights IS 'JSON array of AI-generated insights about the email';
COMMENT ON COLUMN incoming_emails.suggested_actions IS 'Array of AI-suggested actions for this email';
COMMENT ON COLUMN incoming_emails.triage_category IS 'Enhanced AI triage subcategory';
COMMENT ON COLUMN incoming_emails.ai_tag IS 'Primary AI classification tag';
