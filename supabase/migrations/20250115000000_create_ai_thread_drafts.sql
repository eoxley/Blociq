-- Create ai_thread_drafts table for storing email draft memory
-- This enables the transform_reply mode to work with previous drafts

CREATE TABLE IF NOT EXISTS public.ai_thread_drafts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT NOT NULL,
    tone TEXT NOT NULL,
    context JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    building_id TEXT REFERENCES public.buildings(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_thread_drafts_thread_id ON public.ai_thread_drafts(thread_id);
CREATE INDEX IF NOT EXISTS idx_ai_thread_drafts_user_id ON public.ai_thread_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_thread_drafts_building_id ON public.ai_thread_drafts(building_id);
CREATE INDEX IF NOT EXISTS idx_ai_thread_drafts_updated_at ON public.ai_thread_drafts(updated_at);

-- Create unique constraint to ensure one draft per thread per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_thread_drafts_thread_user_unique 
ON public.ai_thread_drafts(thread_id, user_id);

-- Add RLS policies
ALTER TABLE public.ai_thread_drafts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own drafts
CREATE POLICY "Users can view own drafts" ON public.ai_thread_drafts
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own drafts
CREATE POLICY "Users can insert own drafts" ON public.ai_thread_drafts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own drafts
CREATE POLICY "Users can update own drafts" ON public.ai_thread_drafts
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own drafts
CREATE POLICY "Users can delete own drafts" ON public.ai_thread_drafts
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_thread_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_ai_thread_drafts_updated_at
    BEFORE UPDATE ON public.ai_thread_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_thread_drafts_updated_at();

-- Add comment to table
COMMENT ON TABLE public.ai_thread_drafts IS 'Stores email drafts for AI transform mode, enabling users to modify previous AI-generated content while preserving context and structure';

-- Add comments to columns
COMMENT ON COLUMN public.ai_thread_drafts.thread_id IS 'Unique identifier for email thread or conversation session';
COMMENT ON COLUMN public.ai_thread_drafts.subject IS 'Email subject line';
COMMENT ON COLUMN public.ai_thread_drafts.body_html IS 'Email body in HTML format';
COMMENT ON COLUMN public.ai_thread_drafts.body_text IS 'Email body in plain text format';
COMMENT ON COLUMN public.ai_thread_drafts.tone IS 'Tone used for the draft (Holding, SolicitorFormal, ResidentNotice, SupplierRequest, CasualChaser)';
COMMENT ON COLUMN public.ai_thread_drafts.context IS 'JSON context including building_id, leaseholder_id, unit_number, mode, and original_input';
COMMENT ON COLUMN public.ai_thread_drafts.user_id IS 'User who created the draft';
COMMENT ON COLUMN public.ai_thread_drafts.building_id IS 'Building associated with the draft (optional)';
