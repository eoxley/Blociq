-- Update outlook subscription function to handle trial status

-- Update the check_outlook_subscription function to include trialing subscriptions
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
    AND subscription_status IN ('active', 'trialing') -- Include trialing subscriptions
    AND (current_period_end IS NULL OR current_period_end > NOW())
    AND (trial_end IS NULL OR trial_end > NOW()) -- Include active trials
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT
            TRUE as is_active,
            sub.id as subscription_id,
            GREATEST(0, sub.monthly_usage_limit - sub.monthly_usage_count) as usage_remaining,
            COALESCE(sub.trial_end, sub.current_period_end) as expires_at;
    ELSE
        RETURN QUERY SELECT
            FALSE as is_active,
            NULL::UUID as subscription_id,
            0 as usage_remaining,
            NULL::TIMESTAMP WITH TIME ZONE as expires_at;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the log_outlook_usage function to handle unlimited trial usage
CREATE OR REPLACE FUNCTION log_outlook_usage(
    user_email TEXT,
    endpoint_name TEXT,
    request_type TEXT,
    tokens_used INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    sub outlook_subscriptions%ROWTYPE;
    usage_exceeded BOOLEAN := FALSE;
BEGIN
    -- Get subscription
    SELECT * INTO sub
    FROM outlook_subscriptions
    WHERE email = user_email
    AND subscription_status IN ('active', 'trialing')
    AND (current_period_end IS NULL OR current_period_end > NOW())
    AND (trial_end IS NULL OR trial_end > NOW());

    IF NOT FOUND THEN
        RETURN FALSE; -- No active subscription
    END IF;

    -- For trialing subscriptions, allow unlimited usage
    IF sub.subscription_status = 'trialing' THEN
        -- Log the usage but don't check limits
        INSERT INTO outlook_usage_logs (
            subscription_id,
            user_email,
            endpoint,
            request_type,
            tokens_used,
            created_at
        ) VALUES (
            sub.id,
            user_email,
            endpoint_name,
            request_type,
            tokens_used,
            NOW()
        );

        -- Update usage count for tracking (but don't enforce limits)
        UPDATE outlook_subscriptions
        SET monthly_usage_count = monthly_usage_count + tokens_used,
            updated_at = NOW()
        WHERE id = sub.id;

        RETURN TRUE;
    END IF;

    -- For active (non-trial) subscriptions, check limits
    IF (sub.monthly_usage_count + tokens_used) > sub.monthly_usage_limit THEN
        usage_exceeded := TRUE;
    END IF;

    -- Log the usage
    INSERT INTO outlook_usage_logs (
        subscription_id,
        user_email,
        endpoint,
        request_type,
        tokens_used,
        usage_exceeded,
        created_at
    ) VALUES (
        sub.id,
        user_email,
        endpoint_name,
        request_type,
        tokens_used,
        usage_exceeded,
        NOW()
    );

    IF usage_exceeded THEN
        RETURN FALSE; -- Usage limit exceeded
    END IF;

    -- Update usage count
    UPDATE outlook_subscriptions
    SET monthly_usage_count = monthly_usage_count + tokens_used,
        updated_at = NOW()
    WHERE id = sub.id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;