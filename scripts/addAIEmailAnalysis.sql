-- Add AI analysis fields to incoming_emails table
-- This migration adds fields for AI-powered email tagging, summarization, and action suggestions

-- Add tags column for AI-generated email categorization
DO $$ BEGIN
    ALTER TABLE incoming_emails ADD COLUMN tags TEXT[];
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add AI summary column for email content summarization
DO $$ BEGIN
    ALTER TABLE incoming_emails ADD COLUMN ai_summary TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add suggested action column for AI-recommended next steps
DO $$ BEGIN
    ALTER TABLE incoming_emails ADD COLUMN suggested_action TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add suggested action type for categorizing the type of action
DO $$ BEGIN
    ALTER TABLE incoming_emails ADD COLUMN suggested_action_type TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add template ID if the suggested action involves generating a document
DO $$ BEGIN
    ALTER TABLE incoming_emails ADD COLUMN suggested_template_id UUID REFERENCES templates(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add related unit ID if the email is related to a specific unit
DO $$ BEGIN
    ALTER TABLE incoming_emails ADD COLUMN related_unit_id UUID REFERENCES units(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add AI analysis timestamp
DO $$ BEGIN
    ALTER TABLE incoming_emails ADD COLUMN ai_analyzed_at TIMESTAMP WITH TIME ZONE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_incoming_emails_tags ON incoming_emails USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_suggested_action_type ON incoming_emails(suggested_action_type);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_ai_analyzed_at ON incoming_emails(ai_analyzed_at);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_suggested_template_id ON incoming_emails(suggested_template_id);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_related_unit_id ON incoming_emails(related_unit_id);

-- Add comments for documentation
COMMENT ON COLUMN incoming_emails.tags IS 'AI-generated tags for email categorization (e.g., ["service charge", "complaint", "maintenance"])';
COMMENT ON COLUMN incoming_emails.ai_summary IS 'AI-generated summary of email content';
COMMENT ON COLUMN incoming_emails.suggested_action IS 'AI-suggested next action for this email';
COMMENT ON COLUMN incoming_emails.suggested_action_type IS 'Type of suggested action: generate_template, reply, raise_task, etc.';
COMMENT ON COLUMN incoming_emails.suggested_template_id IS 'Template ID to use if suggested action is generate_template';
COMMENT ON COLUMN incoming_emails.related_unit_id IS 'Unit ID if email is related to a specific unit';
COMMENT ON COLUMN incoming_emails.ai_analyzed_at IS 'Timestamp when AI analysis was performed'; 