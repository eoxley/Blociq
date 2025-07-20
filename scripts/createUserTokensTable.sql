-- Create user_tokens table for storing OAuth tokens (Microsoft Graph, etc.)
CREATE TABLE IF NOT EXISTS user_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'microsoft', 'google', etc.
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_provider ON user_tokens(user_id, provider);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_tokens_updated_at 
    BEFORE UPDATE ON user_tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own tokens
CREATE POLICY "Users can view own tokens" ON user_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON user_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON user_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON user_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Insert sample data for testing (optional)
-- INSERT INTO user_tokens (user_id, provider, access_token, refresh_token, expires_at, scope)
-- VALUES (
--     'your-user-id-here',
--     'microsoft',
--     'sample-access-token',
--     'sample-refresh-token',
--     NOW() + INTERVAL '1 hour',
--     'Calendars.ReadWrite'
-- ); 