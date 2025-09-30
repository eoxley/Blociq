-- ========================================
-- BLOCIQ AGENCY BRANDING SYSTEM
-- Date: 2024-12-21
-- Description: Agency-specific UI customization with colors and logos
-- ========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. AGENCY SETTINGS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS agency_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    primary_colour VARCHAR(7) DEFAULT '#6366f1', -- Default BlocIQ purple
    logo_url TEXT,
    secondary_colour VARCHAR(7),
    accent_colour VARCHAR(7),
    font_family VARCHAR(100) DEFAULT 'Inter',
    custom_css TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_primary_colour_format CHECK (primary_colour ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT chk_secondary_colour_format CHECK (secondary_colour IS NULL OR secondary_colour ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT chk_accent_colour_format CHECK (accent_colour IS NULL OR accent_colour ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT chk_unique_agency_settings UNIQUE (agency_id)
);

-- ========================================
-- 2. INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_agency_settings_agency_id ON agency_settings(agency_id);

-- ========================================
-- 3. TRIGGERS FOR AUTOMATIC UPDATES
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_agency_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_agency_settings_updated_at_trigger
    BEFORE UPDATE ON agency_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_agency_settings_updated_at();

-- ========================================
-- 4. RLS POLICIES
-- ========================================

-- Enable RLS
ALTER TABLE agency_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view settings for their agency
CREATE POLICY "Users can view their agency settings" ON agency_settings
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        agency_id = (
            SELECT agency_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: Managers and directors can update their agency settings
CREATE POLICY "Managers can update their agency settings" ON agency_settings
    FOR ALL USING (
        auth.uid() IS NOT NULL AND
        agency_id = (
            SELECT agency_id FROM profiles WHERE id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('manager', 'director')
        )
    );

-- ========================================
-- 5. HELPER FUNCTIONS
-- ========================================

-- Function to get or create agency settings
CREATE OR REPLACE FUNCTION get_or_create_agency_settings(agency_uuid UUID)
RETURNS agency_settings AS $$
DECLARE
    result agency_settings;
BEGIN
    -- Try to get existing settings
    SELECT * INTO result FROM agency_settings WHERE agency_id = agency_uuid;
    
    -- If no settings exist, create default ones
    IF NOT FOUND THEN
        INSERT INTO agency_settings (agency_id, primary_colour)
        VALUES (agency_uuid, '#6366f1')
        RETURNING * INTO result;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update agency branding
CREATE OR REPLACE FUNCTION update_agency_branding(
    agency_uuid UUID,
    primary_color VARCHAR(7) DEFAULT NULL,
    logo_url_param TEXT DEFAULT NULL,
    secondary_color VARCHAR(7) DEFAULT NULL,
    accent_color VARCHAR(7) DEFAULT NULL,
    font_family_param VARCHAR(100) DEFAULT NULL,
    custom_css_param TEXT DEFAULT NULL
)
RETURNS agency_settings AS $$
DECLARE
    result agency_settings;
BEGIN
    -- Insert or update the settings
    INSERT INTO agency_settings (
        agency_id,
        primary_colour,
        logo_url,
        secondary_colour,
        accent_colour,
        font_family,
        custom_css
    )
    VALUES (
        agency_uuid,
        COALESCE(primary_color, '#6366f1'),
        logo_url_param,
        secondary_color,
        accent_color,
        COALESCE(font_family_param, 'Inter'),
        custom_css_param
    )
    ON CONFLICT (agency_id)
    DO UPDATE SET
        primary_colour = COALESCE(EXCLUDED.primary_colour, agency_settings.primary_colour),
        logo_url = COALESCE(EXCLUDED.logo_url, agency_settings.logo_url),
        secondary_colour = COALESCE(EXCLUDED.secondary_colour, agency_settings.secondary_colour),
        accent_colour = COALESCE(EXCLUDED.accent_colour, agency_settings.accent_colour),
        font_family = COALESCE(EXCLUDED.font_family, agency_settings.font_family),
        custom_css = COALESCE(EXCLUDED.custom_css, agency_settings.custom_css),
        updated_at = NOW()
    RETURNING * INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE agency_settings IS 'Agency-specific branding and UI customization settings';
COMMENT ON COLUMN agency_settings.primary_colour IS 'Primary brand color in hex format (#RRGGBB)';
COMMENT ON COLUMN agency_settings.logo_url IS 'URL to agency logo stored in Supabase Storage';
COMMENT ON COLUMN agency_settings.secondary_colour IS 'Secondary brand color for accents';
COMMENT ON COLUMN agency_settings.accent_colour IS 'Accent color for highlights and CTAs';
COMMENT ON COLUMN agency_settings.font_family IS 'Primary font family for the agency';
COMMENT ON COLUMN agency_settings.custom_css IS 'Additional custom CSS for agency-specific styling';
COMMENT ON FUNCTION get_or_create_agency_settings(UUID) IS 'Gets existing agency settings or creates default ones';
COMMENT ON FUNCTION update_agency_branding(UUID, VARCHAR(7), TEXT, VARCHAR(7), VARCHAR(7), VARCHAR(100), TEXT) IS 'Updates agency branding settings with validation';

-- ========================================
-- 7. INITIAL DATA SETUP
-- ========================================

-- Create default settings for existing agencies (if any)
INSERT INTO agency_settings (agency_id, primary_colour)
SELECT 
    id as agency_id,
    '#6366f1' as primary_colour
FROM agencies
WHERE id NOT IN (SELECT agency_id FROM agency_settings);
