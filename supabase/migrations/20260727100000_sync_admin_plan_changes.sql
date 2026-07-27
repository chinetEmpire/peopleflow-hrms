-- Migration: Atomic admin plan change with subscription sync
-- Ensures organizations.plan and subscriptions table stay in sync

CREATE OR REPLACE FUNCTION public.admin_change_org_plan(
  p_org_id UUID,
  p_plan_id TEXT,
  p_billing_cycle TEXT DEFAULT 'monthly'
)
RETURNS JSONB AS $$
DECLARE
  v_plan RECORD;
  v_sub RECORD;
  v_old_plan TEXT;
  v_now TIMESTAMPTZ := now();
  v_period_end TIMESTAMPTZ;
BEGIN
  -- Get current plan for audit
  SELECT plan INTO v_old_plan FROM organizations WHERE id = p_org_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Verify the plan exists
  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found: %', p_plan_id;
  END IF;

  -- Calculate period end
  IF p_billing_cycle = 'yearly' THEN
    v_period_end := v_now + INTERVAL '1 year';
  ELSE
    v_period_end := v_now + INTERVAL '1 month';
  END IF;

  -- Upsert subscription (one per org)
  INSERT INTO subscriptions (org_id, plan_id, status, billing_cycle, current_period_start, current_period_end, payment_provider)
  VALUES (p_org_id, p_plan_id, 'active', p_billing_cycle, v_now, v_period_end, 'manual')
  ON CONFLICT (org_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = 'active',
    billing_cycle = EXCLUDED.billing_cycle,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    payment_provider = 'manual',
    canceled_at = NULL,
    updated_at = v_now
  RETURNING * INTO v_sub;

  -- Update organization to stay in sync
  UPDATE organizations
  SET plan = p_plan_id,
      max_employees = v_plan.max_employees,
      updated_at = v_now
  WHERE id = p_org_id;

  -- Create invoice for paid plan changes
  IF v_plan.price_monthly > 0 AND (v_old_plan IS NULL OR v_old_plan != p_plan_id) THEN
    INSERT INTO invoices (org_id, subscription_id, amount, currency, status, description, invoice_date, due_date)
    VALUES (
      p_org_id,
      v_sub.id,
      CASE WHEN p_billing_cycle = 'yearly' THEN v_plan.price_yearly ELSE v_plan.price_monthly END,
      v_plan.currency,
      'paid',
      p_billing_cycle || ' ' || v_plan.name || ' plan' || CASE WHEN v_old_plan IS NOT NULL AND v_old_plan != 'free' THEN ' (upgraded from ' || v_old_plan || ')' ELSE '' END,
      v_now,
      v_now
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub.id,
    'plan_id', p_plan_id,
    'old_plan', v_old_plan,
    'billing_cycle', p_billing_cycle,
    'period_end', v_period_end
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access
GRANT EXECUTE ON FUNCTION public.admin_change_org_plan(UUID, TEXT, TEXT) TO authenticated;
