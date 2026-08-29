-- ============================================================
-- Rework plans to 3 tiers (Free / Starter / Professional)
-- + add 'pending' subscription status for paid-plan registration
-- + rebase any Enterprise subscriptions/orgs to Professional
-- ============================================================

-- 1. Allow 'pending' status on subscriptions (unpaid pre-registration payments)
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'paused', 'pending'));

-- 2. Seed the new 3-tier plans
INSERT INTO plans (id, name, price_monthly, price_yearly, currency, max_employees, max_departments, features, is_popular, sort_order) VALUES
  ('free', 'Free', 0, 0, 'NGN', 10, 3, '["Attendance tracking", "Basic leave management", "Employee profiles", "Standard support"]'::jsonb, false, 1),
  ('starter', 'Starter', 8500, 100000, 'NGN', 20, 5, '["Everything in Free", "Basic Payroll processing", "Standard support"]'::jsonb, false, 2),
  ('pro', 'Professional', 21500, 250000, 'NGN', 50, 10, '["Everything in Starter", "Payroll processing", "Advanced reports", "Custom branding", "Priority support"]'::jsonb, true, 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  currency = EXCLUDED.currency,
  max_employees = EXCLUDED.max_employees,
  max_departments = EXCLUDED.max_departments,
  features = EXCLUDED.features,
  is_popular = EXCLUDED.is_popular,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- 3. Rebase any Enterprise subscriptions and orgs to Professional (50 employees)
UPDATE subscriptions
SET plan_id = 'pro',
    updated_at = now()
WHERE plan_id = 'enterprise';

UPDATE organizations
SET plan = 'pro',
    max_employees = 50,
    updated_at = now()
WHERE plan = 'enterprise';

-- 4. Remove the Enterprise plan (safe now that nothing references it)
DELETE FROM plans WHERE id = 'enterprise';

-- 5. Tighten the organizations plan CHECK to only allow the 3 remaining tiers
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_plan_check
  CHECK (plan IN ('free', 'starter', 'pro'));