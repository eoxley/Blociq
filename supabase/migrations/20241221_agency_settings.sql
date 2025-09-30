-- ========================================
-- BLOCIQ: AGENCY SETTINGS & BRANDING
-- Date: 2024-12-21
-- Description: Table for agency branding (primary colour, logo)
-- ========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agency Settings (branding)
CREATE TABLE IF NOT EXISTS agency_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    primary_colour TEXT DEFAULT '#6366f1', -- BlocIQ purple
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_primary_colour_hex CHECK (primary_colour ~ '^#[0-9a-fA-F]{6}$')
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_settings_agency_id ON agency_settings(agency_id);

-- Enable RLS
ALTER TABLE agency_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Agency users can view their own settings" ON agency_settings
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        agency_id IN (
            SELECT id FROM agencies
            WHERE id IN (
                SELECT agency_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Agency users can insert their own settings" ON agency_settings
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        agency_id IN (
            SELECT id FROM agencies
            WHERE id IN (
                SELECT agency_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Agency users can update their own settings" ON agency_settings
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND
        agency_id IN (
            SELECT id FROM agencies
            WHERE id IN (
                SELECT agency_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_agency_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agency_settings_updated_at_trigger
    BEFORE UPDATE ON agency_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_agency_settings_updated_at();

-- Comment
COMMENT ON TABLE agency_settings IS 'Agency branding settings (primary colour, logo)';
