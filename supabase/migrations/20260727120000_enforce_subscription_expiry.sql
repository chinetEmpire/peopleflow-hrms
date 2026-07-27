-- ============================================================
-- Phase 4: Subscription Expiry Enforcement
-- ============================================================

-- Function to enforce expired subscriptions
-- Finds active/trialing subscriptions past their period end and marks them past_due
-- Also finds expired trials and marks them past_due
CREATE OR REPLACE FUNCTION public.enforce_expired_subscriptions()
RETURNS JSONB AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_updated_active INT := 0;
  v_updated_trial INT := 0;
  v_updated_overdue INT := 0;
BEGIN
  -- 1. Active subscriptions past their billing period → past_due
  UPDATE subscriptions
  SET status = 'past_due',
      updated_at = v_now
  WHERE status = 'active'
    AND current_period_end < v_now;

  GET DIAGNOSTICS v_updated_active = ROW_COUNT;

  -- 2. Trialing subscriptions past their trial end → past_due
  UPDATE subscriptions
  SET status = 'past_due',
      updated_at = v_now
  WHERE status = 'trialing'
    AND (
      (trial_ends_at IS NOT NULL AND trial_ends_at < v_now)
      OR (trial_ends_at IS NULL AND current_period_end < v_now)
    );

  GET DIAGNOSTICS v_updated_trial = ROW_COUNT;

  -- 3. Past_due subscriptions overdue by 7+ days → paused
  UPDATE subscriptions
  SET status = 'paused',
      updated_at = v_now
  WHERE status = 'past_due'
    AND current_period_end < (v_now - INTERVAL '7 days');

  GET DIAGNOSTICS v_updated_overdue = ROW_COUNT;

  -- Log enforcement run
  INSERT INTO audit_logs (actor_id, org_id, action, entity, details)
  VALUES (
    NULL,
    NULL,
    'enforce_expiry',
    'subscription',
    jsonb_build_object(
      'expired_active', v_updated_active,
      'expired_trial', v_updated_trial,
      'auto_paused', v_updated_overdue,
      'enforced_at', v_now
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'expired_active', v_updated_active,
    'expired_trial', v_updated_trial,
    'auto_paused', v_updated_overdue,
    'enforced_at', v_now
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.enforce_expired_subscriptions() TO authenticated;

-- Function to check if an org's subscription allows actions
CREATE OR REPLACE FUNCTION public.check_subscription_active(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM subscriptions
    WHERE org_id = org_uuid
      AND status IN ('active', 'trialing')
  )
  OR NOT EXISTS (
    SELECT 1
    FROM subscriptions
    WHERE org_id = org_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_subscription_active(UUID) TO authenticated;
