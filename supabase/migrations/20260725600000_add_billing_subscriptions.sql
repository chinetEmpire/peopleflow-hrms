-- ============================================================
-- Phase 6: Billing & Subscriptions
-- ============================================================

-- Plans table defining features per tier
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  max_employees INT NOT NULL,
  max_departments INT NOT NULL DEFAULT -1,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_popular BOOLEAN DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'paused')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_ends_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  payment_provider TEXT CHECK (payment_provider IN ('stripe', 'flutterwave', 'manual')),
  external_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id)
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  description TEXT,
  invoice_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_provider TEXT,
  external_invoice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add billing columns to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_email TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id);

-- RLS policies
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Plans are public (read-only for everyone)
CREATE POLICY "Plans are viewable by everyone" ON plans FOR SELECT USING (true);

-- Subscriptions: org members can view, super_admin can manage
CREATE POLICY "Org members can view their subscription" ON subscriptions
  FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Super admins can manage subscriptions" ON subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Invoices: org members can view, super_admin can manage
CREATE POLICY "Org members can view their invoices" ON invoices
  FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Super admins can manage invoices" ON invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Seed default plans
INSERT INTO plans (id, name, price_monthly, price_yearly, max_employees, max_departments, features, is_popular, sort_order) VALUES
  ('free', 'Free', 0, 0, 10, 3, '["Employee Management", "Basic Attendance", "Time Off Requests", "Basic Reports"]'::jsonb, false, 1),
  ('starter', 'Starter', 29, 290, 50, 10, '["Employee Management", "Attendance Tracking", "Leave Management", "Reports & Analytics", "Email Notifications", "Custom Branding"]'::jsonb, false, 2),
  ('pro', 'Professional', 79, 790, 200, 50, '["Everything in Starter", "Advanced Reports", "Payroll Integration", "API Access", "Priority Support", "Multi-department"]'::jsonb, true, 3),
  ('enterprise', 'Enterprise', 199, 1990, -1, -1, '["Everything in Pro", "Unlimited Employees", "Custom Integrations", "Dedicated Support", "SLA Guarantee", "SSO Authentication"]'::jsonb, false, 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  max_employees = EXCLUDED.max_employees,
  max_departments = EXCLUDED.max_departments,
  features = EXCLUDED.features,
  is_popular = EXCLUDED.is_popular,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Function to get current subscription for an org
CREATE OR REPLACE FUNCTION get_current_subscription(org_uuid UUID)
RETURNS TABLE (
  subscription_id UUID,
  plan_id TEXT,
  plan_name TEXT,
  status TEXT,
  billing_cycle TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  price_monthly NUMERIC,
  price_yearly NUMERIC,
  max_employees INT,
  max_departments INT,
  features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS subscription_id,
    p.id AS plan_id,
    p.name AS plan_name,
    s.status,
    s.billing_cycle,
    s.current_period_start,
    s.current_period_end,
    s.trial_ends_at,
    p.price_monthly,
    p.price_yearly,
    p.max_employees,
    p.max_departments,
    p.features
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.org_id = org_uuid
    AND s.status IN ('active', 'trialing');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get org usage stats
CREATE OR REPLACE FUNCTION get_org_usage(org_uuid UUID)
RETURNS TABLE (
  employee_count BIGINT,
  department_count BIGINT,
  plan_max_employees INT,
  plan_max_departments INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM profiles WHERE org_id = org_uuid AND is_active = true) AS employee_count,
    (SELECT COUNT(*) FROM departments WHERE org_id = org_uuid) AS department_count,
    COALESCE(
      (SELECT p.max_employees FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.org_id = org_uuid AND s.status IN ('active', 'trialing')),
      (SELECT o.max_employees FROM organizations o WHERE o.id = org_uuid)
    ) AS plan_max_employees,
    COALESCE(
      (SELECT p.max_departments FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.org_id = org_uuid AND s.status IN ('active', 'trialing')),
      (SELECT 3)  -- default for free
    ) AS plan_max_departments;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
