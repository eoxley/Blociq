-- Optional AI Enhancement Fields for Enhanced Inbox Features
-- Run this script ONLY if you want advanced AI triage capabilities
-- The inbox-overview page will work without these fields (with basic functionality)

-- Add enhanced AI triage fields to incoming_emails table
DO $$ 
BEGIN
    -- Check if the urgency_level column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'incoming_emails' 
        AND column_name = 'urgency_level'
    ) THEN
        -- Add new columns for enhanced triage functionality
        ALTER TABLE incoming_emails 
        ADD COLUMN urgency_level VARCHAR(20) DEFAULT 'low' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
        ADD COLUMN urgency_score INTEGER DEFAULT 0,
        ADD COLUMN mentioned_properties TEXT[],
        ADD COLUMN ai_insights JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN suggested_actions TEXT[] DEFAULT '{}',
        ADD COLUMN ai_tag VARCHAR(100) DEFAULT 'General',
        ADD COLUMN triage_category VARCHAR(100) DEFAULT 'General';
        
        RAISE NOTICE 'Enhanced AI fields added to incoming_emails table';
    ELSE
        RAISE NOTICE 'Enhanced AI fields already exist in incoming_emails table';
    END IF;

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_incoming_emails_urgency_level ON incoming_emails(urgency_level);
    CREATE INDEX IF NOT EXISTS idx_incoming_emails_urgency_score ON incoming_emails(urgency_score);
    CREATE INDEX IF NOT EXISTS idx_incoming_emails_ai_tag ON incoming_emails(ai_tag);
    CREATE INDEX IF NOT EXISTS idx_incoming_emails_triage_category ON incoming_emails(triage_category);
    
    RAISE NOTICE 'Enhanced AI indexes created';
END $$;

-- Optional: Update existing emails with default AI values
-- This ensures existing emails work with the new dashboard features
UPDATE incoming_emails 
SET 
    urgency_level = 'low',
    urgency_score = 0,
    mentioned_properties = '{}',
    ai_insights = '[]'::jsonb,
    suggested_actions = '{}',
    ai_tag = 'General',
    triage_category = 'General'
WHERE urgency_level IS NULL;

-- Create a simple function to calculate urgency score based on subject/content
-- This provides basic urgency detection even without AI
CREATE OR REPLACE FUNCTION calculate_basic_urgency(subject TEXT, body TEXT)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER DEFAULT 0;
    urgent_keywords TEXT[] := ARRAY['urgent', 'emergency', 'immediate', 'asap', 'leak', 'fire', 'danger', 'broken', 'repair'];
    high_keywords TEXT[] := ARRAY['complaint', 'issue', 'problem', 'concern', 'maintenance', 'payment'];
    keyword TEXT;
BEGIN
    -- Check for urgent keywords in subject (higher weight)
    FOREACH keyword IN ARRAY urgent_keywords LOOP
        IF LOWER(subject) LIKE '%' || keyword || '%' THEN
            score := score + 3;
        END IF;
        IF LOWER(body) LIKE '%' || keyword || '%' THEN
            score := score + 2;
        END IF;
    END LOOP;
    
    -- Check for high priority keywords
    FOREACH keyword IN ARRAY high_keywords LOOP
        IF LOWER(subject) LIKE '%' || keyword || '%' THEN
            score := score + 2;
        END IF;
        IF LOWER(body) LIKE '%' || keyword || '%' THEN
            score := score + 1;
        END IF;
    END LOOP;
    
    -- Cap the score at 15
    RETURN LEAST(score, 15);
END;
$$ LANGUAGE plpgsql;

-- Optional: Update existing emails with basic urgency scoring
-- Uncomment the following lines if you want to retroactively score existing emails
/*
UPDATE incoming_emails 
SET 
    urgency_score = calculate_basic_urgency(COALESCE(subject, ''), COALESCE(body, '')),
    urgency_level = CASE 
        WHEN calculate_basic_urgency(COALESCE(subject, ''), COALESCE(body, '')) >= 9 THEN 'critical'
        WHEN calculate_basic_urgency(COALESCE(subject, ''), COALESCE(body, '')) >= 6 THEN 'high'
        WHEN calculate_basic_urgency(COALESCE(subject, ''), COALESCE(body, '')) >= 3 THEN 'medium'
        ELSE 'low'
    END,
    ai_tag = CASE 
        WHEN LOWER(subject) LIKE '%payment%' OR LOWER(subject) LIKE '%service charge%' THEN 'Payment'
        WHEN LOWER(subject) LIKE '%maintenance%' OR LOWER(subject) LIKE '%repair%' THEN 'Maintenance'
        WHEN LOWER(subject) LIKE '%complaint%' OR LOWER(subject) LIKE '%issue%' THEN 'Complaint'
        WHEN LOWER(subject) LIKE '%legal%' OR LOWER(subject) LIKE '%solicitor%' THEN 'Legal'
        ELSE 'General'
    END
WHERE urgency_score = 0;
*/

COMMENT ON TABLE incoming_emails IS 'Enhanced with optional AI triage fields for advanced inbox features';
COMMENT ON COLUMN incoming_emails.urgency_level IS 'AI-determined urgency level: low, medium, high, critical';
COMMENT ON COLUMN incoming_emails.urgency_score IS 'Numeric urgency score 0-15 for fine-grained prioritization';
COMMENT ON COLUMN incoming_emails.mentioned_properties IS 'Array of property names mentioned in the email';
COMMENT ON COLUMN incoming_emails.ai_insights IS 'JSON array of AI-generated insights about the email';
COMMENT ON COLUMN incoming_emails.suggested_actions IS 'Array of AI-suggested actions for handling the email';
COMMENT ON COLUMN incoming_emails.ai_tag IS 'AI-generated category tag for the email';
COMMENT ON COLUMN incoming_emails.triage_category IS 'Enhanced category for triage purposes';
