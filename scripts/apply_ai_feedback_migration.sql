-- ========================================
-- APPLY AI FEEDBACK MIGRATION
-- Date: 2025-01-15
-- Description: Apply the ai_feedback table migration manually
-- ========================================

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- First, create or enhance the ai_logs table
-- Drop the table if it exists to ensure we have the correct schema
DROP TABLE IF EXISTS ai_feedback CASCADE;
DROP TABLE IF EXISTS ai_logs CASCADE;

CREATE TABLE ai_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  building_id UUID,
  question TEXT,
  response TEXT,
  context_type VARCHAR(100),
  document_ids TEXT, -- JSON array as text
  leaseholder_id UUID,
  email_thread_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for ai_logs
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_building_id ON ai_logs(building_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_context_type ON ai_logs(context_type);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at);

-- Enable RLS for ai_logs
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_logs
CREATE POLICY "Users can view their own AI logs" ON ai_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI logs" ON ai_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger to update updated_at for ai_logs
CREATE OR REPLACE FUNCTION update_ai_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_logs_updated_at
  BEFORE UPDATE ON ai_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_logs_updated_at();

-- Now create the ai_feedback table
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ai_log_id UUID REFERENCES ai_logs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating IN (-1, 0, 1)), -- -1: thumbs down, 0: neutral, 1: thumbs up
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_feedback_ai_log_id ON ai_feedback(ai_log_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_rating ON ai_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at ON ai_feedback(created_at);

-- Enable RLS
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own feedback" ON ai_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback" ON ai_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback" ON ai_feedback
  FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_ai_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_feedback_updated_at
  BEFORE UPDATE ON ai_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_feedback_updated_at();

-- Verify the tables were created
SELECT 'ai_logs and ai_feedback tables created successfully' as status; 