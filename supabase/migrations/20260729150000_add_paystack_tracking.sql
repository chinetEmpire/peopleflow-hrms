-- ============================================================
-- Phase 12: Paystack payment tracking
-- Replaces Flutterwave as the primary payment gateway
-- ============================================================

-- Add paystack-specific columns to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paystack_reference TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paystack_customer_id TEXT;

-- Add paystack-specific columns to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paystack_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_paystack_reference ON subscriptions(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_invoices_paystack_reference ON invoices(paystack_reference);

-- Allow 'paystack' as a payment provider (flutterwave kept for legacy rows)
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_payment_provider_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_payment_provider_check
  CHECK (payment_provider IN ('stripe', 'flutterwave', 'paystack', 'manual'));