-- ========================================
-- MULTI-AGENCY SETUP: CONNECTED ACCOUNTS
-- Migration: 0005_connected_accounts.sql
-- Description: Create agency-scoped connected accounts for OAuth integrations
-- ========================================

-- Create connected_accounts table for agency-scoped OAuth tokens
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Provider information
  provider text NOT NULL, -- 'outlook', 'gmail', 'slack', etc.
  provider_account_id text, -- External account ID from provider
  account_email text NOT NULL,
  account_name text,
  
  -- OAuth tokens
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  token_type text DEFAULT 'Bearer',
  scope text, -- OAuth scopes granted
  
  -- Connection status
  status text NOT NULL DEFAULT 'active', -- active, expired, revoked, error
  last_sync_at timestamptz,
  sync_error text,
  
  -- Metadata
  provider_data jsonb DEFAULT '{}'::jsonb, -- Store provider-specific data
  settings jsonb DEFAULT '{}'::jsonb, -- User preferences for this connection
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT connected_accounts_provider_check CHECK (provider IN ('outlook', 'gmail', 'slack', 'teams', 'other')),
  CONSTRAINT connected_accounts_status_check CHECK (status IN ('active', 'expired', 'revoked', 'error', 'pending')),
  CONSTRAINT connected_accounts_agency_provider_email_unique UNIQUE (agency_id, provider, account_email)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_connected_accounts_agency_id ON public.connected_accounts(agency_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id ON public.connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_provider ON public.connected_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_status ON public.connected_accounts(status);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_expires_at ON public.connected_accounts(expires_at);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_email ON public.connected_accounts(account_email);

-- Add updated_at trigger
CREATE TRIGGER update_connected_accounts_updated_at 
  BEFORE UPDATE ON public.connected_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view connected accounts in their agencies
DROP POLICY IF EXISTS "connected_accounts: select own agency" ON public.connected_accounts;
CREATE POLICY "connected_accounts: select own agency"
ON public.connected_accounts
FOR SELECT USING (public.is_member_of_agency(agency_id));

-- Admin+ can manage connected accounts in their agencies
DROP POLICY IF EXISTS "connected_accounts: manage by admin+" ON public.connected_accounts;
CREATE POLICY "connected_accounts: manage by admin+"
ON public.connected_accounts
FOR ALL USING (
  public.is_member_of_agency(agency_id)
  AND EXISTS (
    SELECT 1 FROM public.agency_members m
    WHERE m.agency_id = connected_accounts.agency_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  )
) WITH CHECK (public.is_member_of_agency(agency_id));

-- Users can manage their own connections (if they're members of the agency)
DROP POLICY IF EXISTS "connected_accounts: manage own" ON public.connected_accounts;
CREATE POLICY "connected_accounts: manage own"
ON public.connected_accounts
FOR ALL USING (
  user_id = auth.uid() 
  AND public.is_member_of_agency(agency_id)
) WITH CHECK (
  user_id = auth.uid() 
  AND public.is_member_of_agency(agency_id)
);

-- Function to get active connections for an agency
CREATE OR REPLACE FUNCTION public.get_agency_active_connections(agency_uuid uuid, connection_provider text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  provider text,
  account_email text,
  account_name text,
  status text,
  last_sync_at timestamptz,
  user_email text,
  user_name text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    ca.id,
    ca.provider,
    ca.account_email,
    ca.account_name,
    ca.status,
    ca.last_sync_at,
    u.email as user_email,
    COALESCE(u.full_name, u.email) as user_name
  FROM public.connected_accounts ca
  JOIN auth.users u ON u.id = ca.user_id
  WHERE ca.agency_id = agency_uuid
    AND ca.status = 'active'
    AND (connection_provider IS NULL OR ca.provider = connection_provider)
    AND public.is_member_of_agency(agency_uuid)
  ORDER BY ca.provider, ca.account_email;
$$;

-- Function to refresh expired tokens (placeholder for implementation)
CREATE OR REPLACE FUNCTION public.refresh_expired_tokens()
RETURNS TABLE (
  account_id uuid,
  provider text,
  account_email text,
  needs_refresh boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id as account_id,
    provider,
    account_email,
    (expires_at IS NOT NULL AND expires_at < now() + interval '5 minutes') as needs_refresh
  FROM public.connected_accounts
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now() + interval '1 hour' -- Check tokens expiring within 1 hour
  ORDER BY expires_at;
$$;

-- Function to update connection status
CREATE OR REPLACE FUNCTION public.update_connection_status(
  connection_id uuid,
  new_status text,
  error_message text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user can modify this connection
  IF NOT EXISTS (
    SELECT 1 FROM public.connected_accounts ca
    WHERE ca.id = connection_id
      AND (
        ca.user_id = auth.uid()
        OR public.is_agency_manager_or_above(ca.agency_id)
      )
  ) THEN
    RETURN false;
  END IF;
  
  UPDATE public.connected_accounts
  SET 
    status = new_status,
    sync_error = error_message,
    updated_at = now()
  WHERE id = connection_id;
  
  RETURN FOUND;
END;
$$;

-- Create a view for agency connection overview
CREATE OR REPLACE VIEW public.vw_agency_connections AS
SELECT 
  a.id as agency_id,
  a.name as agency_name,
  a.slug as agency_slug,
  ca.provider,
  COUNT(ca.id) as total_connections,
  COUNT(CASE WHEN ca.status = 'active' THEN 1 END) as active_connections,
  COUNT(CASE WHEN ca.status = 'expired' THEN 1 END) as expired_connections,
  COUNT(CASE WHEN ca.status = 'error' THEN 1 END) as error_connections,
  MAX(ca.last_sync_at) as last_sync_at
FROM public.agencies a
LEFT JOIN public.connected_accounts ca ON ca.agency_id = a.id
GROUP BY a.id, a.name, a.slug, ca.provider
ORDER BY a.name, ca.provider;

-- Grant permissions on the view
GRANT SELECT ON public.vw_agency_connections TO authenticated;

-- Create RLS policy for the view
ALTER VIEW public.vw_agency_connections SET (security_invoker = true);

-- Add sample Outlook connection for MIH (if it doesn't exist)
DO $$
DECLARE
  mih_agency_id uuid;
  test_user_id uuid;
BEGIN
  -- Get MIH agency ID
  SELECT id INTO mih_agency_id FROM public.agencies WHERE slug = 'mih';
  
  -- Get test user ID
  SELECT id INTO test_user_id FROM auth.users WHERE email = 'testbloc@blociq.co.uk';
  
  IF mih_agency_id IS NOT NULL AND test_user_id IS NOT NULL THEN
    -- Insert sample Outlook connection
    INSERT INTO public.connected_accounts (
      agency_id, 
      user_id, 
      provider, 
      account_email, 
      account_name,
      status,
      provider_data,
      settings
    )
    VALUES (
      mih_agency_id,
      test_user_id,
      'outlook',
      'testbloc@blociq.co.uk',
      'Test BlocIQ Account',
      'active',
      '{"tenant_id": "demo", "client_id": "demo"}'::jsonb,
      '{"sync_emails": true, "sync_calendar": true}'::jsonb
    )
    ON CONFLICT (agency_id, provider, account_email) DO UPDATE SET
      account_name = EXCLUDED.account_name,
      status = EXCLUDED.status,
      updated_at = now();
    
    RAISE NOTICE 'Sample Outlook connection created for MIH agency';
  END IF;
END$$;

-- Add comments for documentation
COMMENT ON TABLE public.connected_accounts IS 'Agency-scoped OAuth connections for external services';
COMMENT ON COLUMN public.connected_accounts.agency_id IS 'Agency that owns this connection';
COMMENT ON COLUMN public.connected_accounts.provider IS 'OAuth provider (outlook, gmail, slack, etc.)';
COMMENT ON COLUMN public.connected_accounts.account_email IS 'Email address of the connected account';
COMMENT ON COLUMN public.connected_accounts.access_token IS 'OAuth access token (encrypted in production)';
COMMENT ON COLUMN public.connected_accounts.refresh_token IS 'OAuth refresh token (encrypted in production)';
COMMENT ON COLUMN public.connected_accounts.expires_at IS 'When the access token expires';
COMMENT ON COLUMN public.connected_accounts.status IS 'Connection status (active, expired, revoked, error)';
COMMENT ON COLUMN public.connected_accounts.provider_data IS 'Provider-specific metadata (tenant_id, etc.)';
COMMENT ON COLUMN public.connected_accounts.settings IS 'User preferences for this connection';

COMMENT ON FUNCTION public.get_agency_active_connections(uuid, text) IS 'Get all active connections for an agency';
COMMENT ON FUNCTION public.refresh_expired_tokens() IS 'Find connections with tokens that need refreshing';
COMMENT ON FUNCTION public.update_connection_status(uuid, text, text) IS 'Update connection status and error message';

COMMENT ON VIEW public.vw_agency_connections IS 'Overview of connections per agency and provider';
