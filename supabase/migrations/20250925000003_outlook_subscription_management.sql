-- Outlook Subscription Management Schema
-- This migration adds comprehensive subscription tracking and management capabilities

-- Add subscription events tracking table
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'activated', 'cancelled', 'suspended', 'reactivated',
    'payment_failed', 'payment_succeeded', 'trial_started', 'trial_ended',
    'usage_limit_reached', 'revoked'
  )),
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for subscription events
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at);

-- Add additional columns to outlook_subscriptions for better management
ALTER TABLE outlook_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_status TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_usage_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS usage_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS billing_cycle_anchor TIMESTAMP WITH TIME ZONE;

-- Create function to get outlook subscription statistics
CREATE OR REPLACE FUNCTION get_outlook_subscription_stats()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_subscriptions', COUNT(*),
    'active_subscriptions', COUNT(*) FILTER (WHERE status = 'active'),
    'cancelled_subscriptions', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'suspended_subscriptions', COUNT(*) FILTER (WHERE status = 'suspended'),
    'trial_subscriptions', COUNT(*) FILTER (WHERE status = 'trial'),
    'payment_failed_subscriptions', COUNT(*) FILTER (WHERE status = 'payment_failed'),
    'total_usage_this_month', COALESCE(SUM(
      CASE
        WHEN created_at >= date_trunc('month', CURRENT_DATE)
        THEN (100 - COALESCE(usage_remaining, 0))
        ELSE 0
      END
    ), 0),
    'average_usage_per_user', COALESCE(AVG(
      CASE
        WHEN status = 'active'
        THEN (100 - COALESCE(usage_remaining, 0))
        ELSE NULL
      END
    ), 0)
  )
  INTO result
  FROM outlook_subscriptions;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to automatically manage subscription lifecycle
CREATE OR REPLACE FUNCTION manage_subscription_lifecycle()
RETURNS VOID AS $$
BEGIN
  -- Reset usage for active subscriptions at the start of each month
  UPDATE outlook_subscriptions
  SET
    usage_remaining = 100,
    usage_reset_at = NOW()
  WHERE
    status = 'active'
    AND usage_reset_at < date_trunc('month', CURRENT_DATE);

  -- Suspend subscriptions that have exceeded usage limits
  UPDATE outlook_subscriptions
  SET
    status = 'usage_exceeded',
    usage_remaining = 0
  WHERE
    status = 'active'
    AND usage_remaining <= 0;

  -- Auto-cancel expired trials
  UPDATE outlook_subscriptions
  SET
    status = 'trial_expired',
    usage_remaining = 0,
    cancelled_at = NOW(),
    cancellation_reason = 'trial_expired'
  WHERE
    status = 'trial'
    AND trial_ends_at < NOW();

  -- Log these automatic changes
  INSERT INTO subscription_events (user_id, event_type, event_data)
  SELECT
    user_id,
    'usage_reset',
    jsonb_build_object('reset_at', NOW(), 'automatic', true)
  FROM outlook_subscriptions
  WHERE usage_reset_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 day'
    AND status = 'active';

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for immediate subscription revocation
CREATE OR REPLACE FUNCTION revoke_outlook_subscription(
  target_email TEXT,
  revocation_reason TEXT DEFAULT 'Administrative action',
  effective_immediately BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
  target_user_id UUID;
  subscription_record RECORD;
  result JSONB;
BEGIN
  -- Find the user
  SELECT id INTO target_user_id
  FROM users
  WHERE email = target_email;

  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Get current subscription
  SELECT * INTO subscription_record
  FROM outlook_subscriptions
  WHERE user_id = target_user_id;

  IF subscription_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No subscription found'
    );
  END IF;

  -- Revoke access immediately
  UPDATE outlook_subscriptions
  SET
    status = 'cancelled',
    usage_remaining = 0, -- IMMEDIATE ACCESS REVOCATION
    cancelled_at = CASE
      WHEN effective_immediately THEN NOW()
      ELSE cancelled_at
    END,
    cancellation_reason = revocation_reason,
    updated_at = NOW()
  WHERE user_id = target_user_id;

  -- Log the revocation
  INSERT INTO subscription_events (user_id, event_type, event_data)
  VALUES (
    target_user_id,
    'revoked',
    jsonb_build_object(
      'reason', revocation_reason,
      'revoked_at', NOW(),
      'previous_status', subscription_record.status,
      'previous_usage', subscription_record.usage_remaining,
      'immediate', effective_immediately,
      'admin_action', true
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Subscription revoked successfully',
    'user_email', target_email,
    'revoked_at', NOW(),
    'previous_status', subscription_record.status
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to bulk revoke subscriptions
CREATE OR REPLACE FUNCTION bulk_revoke_outlook_subscriptions(
  target_emails TEXT[],
  revocation_reason TEXT DEFAULT 'Bulk administrative action'
)
RETURNS JSONB AS $$
DECLARE
  email TEXT;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  results JSONB := '[]'::JSONB;
  revoke_result JSONB;
BEGIN
  -- Process each email
  FOREACH email IN ARRAY target_emails
  LOOP
    SELECT revoke_outlook_subscription(email, revocation_reason, true)
    INTO revoke_result;

    -- Accumulate results
    results := results || jsonb_build_array(
      jsonb_build_object(
        'email', email,
        'success', revoke_result->>'success',
        'message', COALESCE(revoke_result->>'message', revoke_result->>'error')
      )
    );

    IF (revoke_result->>'success')::BOOLEAN THEN
      success_count := success_count + 1;
    ELSE
      error_count := error_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed', array_length(target_emails, 1),
    'successful', success_count,
    'failed', error_count,
    'details', results
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create scheduled job function (to be called by cron or scheduled task)
CREATE OR REPLACE FUNCTION scheduled_subscription_maintenance()
RETURNS VOID AS $$
BEGIN
  -- Run the lifecycle management
  PERFORM manage_subscription_lifecycle();

  -- Clean up old subscription events (keep last 6 months)
  DELETE FROM subscription_events
  WHERE created_at < NOW() - INTERVAL '6 months';

  -- Log maintenance run
  INSERT INTO subscription_events (user_id, event_type, event_data)
  VALUES (
    NULL,
    'maintenance_run',
    jsonb_build_object(
      'run_at', NOW(),
      'automatic', true,
      'cleanup_performed', true
    )
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add row level security policies for subscription events
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Only allow authenticated users to view their own events
CREATE POLICY "Users can view own subscription events" ON subscription_events
  FOR SELECT USING (auth.uid() = user_id);

-- Admin policy for subscription events (implement based on your admin role system)
-- CREATE POLICY "Admins can view all subscription events" ON subscription_events
--   FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_outlook_subscriptions_stripe_customer ON outlook_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_outlook_subscriptions_stripe_status ON outlook_subscriptions(stripe_status);
CREATE INDEX IF NOT EXISTS idx_outlook_subscriptions_last_usage ON outlook_subscriptions(last_usage_at);
CREATE INDEX IF NOT EXISTS idx_outlook_subscriptions_trial_ends ON outlook_subscriptions(trial_ends_at);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_outlook_subscription_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_outlook_subscription(TEXT, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION bulk_revoke_outlook_subscriptions(TEXT[], TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION manage_subscription_lifecycle() TO service_role;
GRANT EXECUTE ON FUNCTION scheduled_subscription_maintenance() TO service_role;

-- Add helpful comments
COMMENT ON TABLE subscription_events IS 'Tracks all subscription lifecycle events for audit and analytics';
COMMENT ON FUNCTION revoke_outlook_subscription IS 'Immediately revokes Outlook add-in access for a user';
COMMENT ON FUNCTION bulk_revoke_outlook_subscriptions IS 'Bulk revoke multiple subscriptions at once';
COMMENT ON FUNCTION manage_subscription_lifecycle IS 'Automated subscription management and cleanup';