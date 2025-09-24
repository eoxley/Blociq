-- Create outlook subscriptions table
CREATE TABLE outlook_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE, -- User's email for standalone subscriptions
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'suspended')),
    subscription_type VARCHAR(50) NOT NULL DEFAULT 'outlook_addon' CHECK (subscription_type IN ('outlook_addon', 'outlook_premium')),
    stripe_subscription_id VARCHAR(255), -- Stripe subscription ID
    stripe_customer_id VARCHAR(255), -- Stripe customer ID
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    monthly_usage_limit INTEGER DEFAULT 1000, -- Monthly API calls limit
    monthly_usage_count INTEGER DEFAULT 0, -- Current month usage
    usage_reset_date TIMESTAMP WITH TIME ZONE DEFAULT date_trunc('month', NOW()) + INTERVAL '1 month',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage tracking table
CREATE TABLE outlook_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id UUID REFERENCES outlook_subscriptions(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    api_endpoint VARCHAR(255) NOT NULL, -- e.g., '/api/ask-ai-outlook', '/api/addin/generate-reply'
    request_type VARCHAR(50) NOT NULL, -- 'generate_reply', 'triage_inbox', 'chat'
    tokens_used INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    request_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_outlook_subscriptions_email ON outlook_subscriptions(email);
CREATE INDEX idx_outlook_subscriptions_status ON outlook_subscriptions(subscription_status);
CREATE INDEX idx_outlook_subscriptions_stripe ON outlook_subscriptions(stripe_subscription_id);
CREATE INDEX idx_outlook_usage_logs_subscription ON outlook_usage_logs(subscription_id);
CREATE INDEX idx_outlook_usage_logs_created ON outlook_usage_logs(created_at);
CREATE INDEX idx_outlook_usage_logs_email ON outlook_usage_logs(user_email);

-- Enable RLS
ALTER TABLE outlook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for outlook_subscriptions
CREATE POLICY "Users can view their own outlook subscription" ON outlook_subscriptions
    FOR SELECT USING (
        auth.uid() = user_id OR
        email = auth.jwt() ->> 'email'
    );

CREATE POLICY "Service role can manage all outlook subscriptions" ON outlook_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for outlook_usage_logs
CREATE POLICY "Users can view their own outlook usage" ON outlook_usage_logs
    FOR SELECT USING (
        user_email = auth.jwt() ->> 'email' OR
        subscription_id IN (
            SELECT id FROM outlook_subscriptions
            WHERE auth.uid() = user_id OR email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Service role can manage all outlook usage logs" ON outlook_usage_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Function to reset monthly usage
CREATE OR REPLACE FUNCTION reset_monthly_outlook_usage()
RETURNS void AS $$
BEGIN
    UPDATE outlook_subscriptions
    SET
        monthly_usage_count = 0,
        usage_reset_date = date_trunc('month', NOW()) + INTERVAL '1 month',
        updated_at = NOW()
    WHERE usage_reset_date <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check subscription status
CREATE OR REPLACE FUNCTION check_outlook_subscription(user_email TEXT)
RETURNS TABLE (
    is_active BOOLEAN,
    subscription_id UUID,
    usage_remaining INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    sub outlook_subscriptions%ROWTYPE;
BEGIN
    SELECT * INTO sub
    FROM outlook_subscriptions
    WHERE email = user_email
    AND subscription_status = 'active'
    AND (current_period_end IS NULL OR current_period_end > NOW())
    LIMIT 1;

    IF sub.id IS NOT NULL THEN
        RETURN QUERY SELECT
            true,
            sub.id,
            GREATEST(0, sub.monthly_usage_limit - sub.monthly_usage_count),
            sub.current_period_end;
    ELSE
        RETURN QUERY SELECT
            false,
            NULL::UUID,
            0,
            NULL::TIMESTAMP WITH TIME ZONE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log API usage
CREATE OR REPLACE FUNCTION log_outlook_usage(
    user_email TEXT,
    endpoint TEXT,
    request_type TEXT,
    tokens_used INTEGER DEFAULT 1,
    response_time_ms INTEGER DEFAULT NULL,
    success BOOLEAN DEFAULT true,
    error_message TEXT DEFAULT NULL,
    request_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
    sub_id UUID;
    current_usage INTEGER;
    usage_limit INTEGER;
BEGIN
    -- Get subscription ID and current usage
    SELECT id, monthly_usage_count, monthly_usage_limit
    INTO sub_id, current_usage, usage_limit
    FROM outlook_subscriptions
    WHERE email = user_email
    AND subscription_status = 'active';

    IF sub_id IS NULL THEN
        RETURN false; -- No active subscription
    END IF;

    -- Check if user has exceeded usage limit
    IF current_usage >= usage_limit THEN
        RETURN false; -- Usage limit exceeded
    END IF;

    -- Log the usage
    INSERT INTO outlook_usage_logs (
        subscription_id,
        user_email,
        api_endpoint,
        request_type,
        tokens_used,
        response_time_ms,
        success,
        error_message,
        request_metadata
    ) VALUES (
        sub_id,
        user_email,
        endpoint,
        request_type,
        tokens_used,
        response_time_ms,
        success,
        error_message,
        request_metadata
    );

    -- Update usage count
    UPDATE outlook_subscriptions
    SET
        monthly_usage_count = monthly_usage_count + tokens_used,
        updated_at = NOW()
    WHERE id = sub_id;

    RETURN true; -- Success
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_outlook_subscriptions_updated_at
    BEFORE UPDATE ON outlook_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Monthly usage reset cron job (run this externally or via pg_cron)
-- SELECT cron.schedule('reset-outlook-usage', '0 0 1 * *', 'SELECT reset_monthly_outlook_usage();');

COMMENT ON TABLE outlook_subscriptions IS 'Standalone Outlook add-in subscriptions';
COMMENT ON TABLE outlook_usage_logs IS 'API usage tracking for Outlook add-in subscribers';