-- Create outlook_tokens table for storing Microsoft OAuth tokens
CREATE TABLE IF NOT EXISTS public.outlook_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.outlook_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own outlook tokens" ON public.outlook_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outlook tokens" ON public.outlook_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outlook tokens" ON public.outlook_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outlook tokens" ON public.outlook_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_outlook_tokens_user_id ON public.outlook_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_outlook_tokens_email ON public.outlook_tokens(email);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_outlook_tokens_updated_at 
    BEFORE UPDATE ON public.outlook_tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 