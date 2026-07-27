-- ============================================================
-- Phase 5: Flutterwave payment tracking
-- ============================================================

-- Add flutterwave-specific columns to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS flutterwave_tx_ref TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS flutterwave_customer_id TEXT;

-- Add flutterwave-specific columns to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS flutterwave_tx_ref TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS flutterwave_flw_ref TEXT;

-- Indexes for payment lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_flutterwave_tx_ref ON subscriptions(flutterwave_tx_ref);
CREATE INDEX IF NOT EXISTS idx_invoices_flutterwave_tx_ref ON invoices(flutterwave_tx_ref);

-- Update RLS to allow webhook processing (anon role can access webhook route)
-- The webhook uses service_role, so no RLS changes needed
