-- Create outlook_tokens table for storing user-specific Outlook OAuth tokens
CREATE TABLE IF NOT EXISTS outlook_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- Add RLS policies for secure access
ALTER TABLE outlook_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tokens
CREATE POLICY "Users can view their own outlook tokens" ON outlook_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own tokens
CREATE POLICY "Users can insert their own outlook tokens" ON outlook_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update their own outlook tokens" ON outlook_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete their own outlook tokens" ON outlook_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_outlook_tokens_user_id ON outlook_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_outlook_tokens_email ON outlook_tokens(email);

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_outlook_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_outlook_tokens_updated_at
  BEFORE UPDATE ON outlook_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_outlook_tokens_updated_at(); 