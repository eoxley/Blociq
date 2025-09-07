-- Create communications_log table for tracking all communication activities
CREATE TABLE IF NOT EXISTS public.communications_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('letter_generation', 'email_send', 'word_csv_export', 'preview')),
    template_id UUID NOT NULL REFERENCES public.communication_templates(id) ON DELETE CASCADE,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_communications_log_agency_id ON public.communications_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_communications_log_type ON public.communications_log(type);
CREATE INDEX IF NOT EXISTS idx_communications_log_status ON public.communications_log(status);
CREATE INDEX IF NOT EXISTS idx_communications_log_created_at ON public.communications_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_log_template_id ON public.communications_log(template_id);

-- Enable RLS
ALTER TABLE public.communications_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Agencies can view their own communication logs" ON public.communications_log
    FOR SELECT USING (
        agency_id IN (
            SELECT id FROM public.agencies 
            WHERE id IN (
                SELECT agency_id FROM public.user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Agencies can insert their own communication logs" ON public.communications_log
    FOR INSERT WITH CHECK (
        agency_id IN (
            SELECT id FROM public.agencies 
            WHERE id IN (
                SELECT agency_id FROM public.user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Agencies can update their own communication logs" ON public.communications_log
    FOR UPDATE USING (
        agency_id IN (
            SELECT id FROM public.agencies 
            WHERE id IN (
                SELECT agency_id FROM public.user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_communications_log_updated_at 
    BEFORE UPDATE ON public.communications_log 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
