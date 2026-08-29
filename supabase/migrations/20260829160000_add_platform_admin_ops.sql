-- ============================================================
-- Phase 13: Platform Admin Ops
-- Payment ledger, reconciliation/refund fields, password resets,
-- and decoupling super_admin accounts from tenant organizations.
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. DECOUPLE PLATFORM ADMINS FROM ORGANIZATIONS
-- ─────────────────────────────────────────────

-- Allow org_id to be NULL ONLY for super_admin (platform staff).
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles.org_id_not_null;
ALTER TABLE profiles ALTER COLUMN org_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_org_id_role_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_org_id_role_check
      CHECK (org_id IS NOT NULL OR role = 'super_admin');
  END IF;
END $$;

-- Existing platform admins cease to be tenant members.
UPDATE profiles SET org_id = NULL WHERE role = 'super_admin' AND org_id IS NOT NULL;

-- Allow platform-scoped audit events (not tied to a company) to have NULL org.
ALTER TABLE audit_logs ALTER COLUMN org_id DROP NOT NULL;

-- ─────────────────────────────────────────────
-- 2. FORCED PASSWORD CHANGE SUPPORT
-- ─────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Audit trail for password resets. The actual temporary password is NEVER
-- stored anywhere — only that one was issued.
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'used', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_status ON password_resets(status);

-- ─────────────────────────────────────────────
-- 3. PAYMENT LEDGER
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  paystack_transaction_id BIGINT NOT NULL,
  reference TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'pending', 'failed', 'partial_refund', 'refunded')),
  channel TEXT,
  paid_at TIMESTAMPTZ,
  customer_email TEXT,
  customer_id TEXT,
  plan_id TEXT,
  billing_cycle TEXT,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  reconciliation_status TEXT NOT NULL DEFAULT 'unmatched' CHECK (reconciliation_status IN ('matched', 'unmatched', 'mismatch', 'manual')),
  reconciled_at TIMESTAMPTZ,
  reconciliation_notes TEXT,
  refund_reference TEXT,
  refunded_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  refund_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (paystack_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_payments_org_id ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_reconciliation_status ON payments(reconciliation_status);

-- ─────────────────────────────────────────────
-- 4. REAL-REFUND TRACKING ON INVOICES
-- ─────────────────────────────────────────────

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paystack_refund_id TEXT;

-- ─────────────────────────────────────────────
-- 5. RLS — payments (super_admin only; service role bypasses)
-- ─────────────────────────────────────────────

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_super_admin_select" ON payments;
CREATE POLICY "payments_super_admin_select" ON payments FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "payments_super_admin_insert" ON payments;
CREATE POLICY "payments_super_admin_insert" ON payments FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "payments_super_admin_update" ON payments;
CREATE POLICY "payments_super_admin_update" ON payments FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "payments_super_admin_delete" ON payments;
CREATE POLICY "payments_super_admin_delete" ON payments FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "password_resets_super_admin_select" ON password_resets;
CREATE POLICY "password_resets_super_admin_select" ON password_resets FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "password_resets_super_admin_insert" ON password_resets;
CREATE POLICY "password_resets_super_admin_insert" ON password_resets FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

DROP POLICY IF EXISTS "password_resets_super_admin_update" ON password_resets;
CREATE POLICY "password_resets_super_admin_update" ON password_resets FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Allow the profile owner to mark their own reset as used after changing password.
DROP POLICY IF EXISTS "password_resets_owner_update" ON password_resets;
CREATE POLICY "password_resets_owner_update" ON password_resets FOR UPDATE
TO authenticated USING (
  user_id = auth.uid() AND status = 'issued'
) WITH CHECK (
  user_id = auth.uid() AND status IN ('used', 'revoked')
);

-- ─────────────────────────────────────────────
-- 6. GRANTS
-- ─────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON password_resets TO authenticated;