import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaystackRefund, PaystackTransaction } from './paystack';

/**
 * Shared platform payment ledger operations (webhook + admin APIs).
 * All writes go through the service-role client; callers must authorize first.
 * The ledger only ever stores money records for REAL tenant organizations.
 */

function toNaira(kobo: number): number {
  const n = (Number(kobo) || 0) / 100;
  return Math.round(n * 100) / 100;
}

export interface LedgerPaymentInput {
  orgId: string;
  transaction: PaystackTransaction;
  planId?: string | null;
  billingCycle?: string | null;
}

/**
 * Idempotently upsert a Paystack transaction into the payments ledger.
 * Never touches reconciliation/refund fields (preserved on re-run).
 */
export async function recordPayment(
  supabase: SupabaseClient,
  input: LedgerPaymentInput,
): Promise<{ error?: string }> {
  const txn = input.transaction;
  const paidAt = txn.paid_at ?? txn.created_at ?? new Date().toISOString();

  const { error } = await supabase.from('payments').upsert(
    {
      org_id: input.orgId,
      paystack_transaction_id: txn.id,
      reference: txn.reference,
      amount: toNaira(txn.amount),
      currency: txn.currency ?? 'NGN',
      status: txn.status === 'success' ? 'success' : txn.status === 'failed' ? 'failed' : 'pending',
      channel: txn.channel ?? txn.authorization?.channel ?? null,
      paid_at: paidAt,
      customer_email: txn.customer?.email ?? null,
      customer_id: txn.customer ? String(txn.customer.id) : null,
      plan_id: input.planId ?? null,
      billing_cycle: input.billingCycle ?? null,
      metadata: {
        plan_id: input.planId ?? null,
        billing_cycle: input.billingCycle ?? null,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'paystack_transaction_id' },
  );

  if (error) return { error: error.message };
  return {};
}

async function findPaymentByRefund(
  supabase: SupabaseClient,
  refund: PaystackRefund,
): Promise<Record<string, any> | null> {
  const txId = refund.transaction_id;
  const ref = refund.transaction?.reference ?? null;

  if (ref) {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('reference', ref)
      .maybeSingle();
    if (data) return data;
  }
  if (txId) {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('paystack_transaction_id', txId)
      .maybeSingle();
    return data;
  }
  return null;
}

/**
 * Apply a Paystack refund event to the ledger + invoice.
 * Multiple partial refunds accumulate; totals are re-derived from history on sync.
 */
export async function recordRefund(
  supabase: SupabaseClient,
  refund: PaystackRefund,
): Promise<{ error?: string; notFound?: boolean }> {
  const payment = await findPaymentByRefund(supabase, refund);
  if (!payment) return { notFound: true };

  const refundAmount = toNaira(refund.amount);
  const history: any[] = Array.isArray(payment.refund_history) ? payment.refund_history : [];
  const priorId = history.find((h) => h.paystack_refund_id === refund.id || h.id === refund.id);

  if (priorId) {
    return { error: 'Refund event already recorded' };
  }

  const now = new Date().toISOString();
  const priorRefunded = Number(payment.refunded_amount ?? 0);
  const nextRefunded = Math.round((priorRefunded + refundAmount) * 100) / 100;
  const totalPaid = Number(payment.amount ?? 0);

  const status =
    refund.status === 'success'
      ? nextRefunded >= totalPaid
        ? 'refunded'
        : 'partial_refund'
      : payment.status;

  const { error: payError } = await supabase
    .from('payments')
    .update({
      status,
      refund_reference: refund.reference ?? refund.id.toString(),
      refunded_amount: nextRefunded,
      refund_history: [
        ...history,
        {
          paystack_refund_id: refund.id,
          reference: refund.reference ?? null,
          status: refund.status,
          amount: refundAmount,
          currency: refund.currency ?? 'NGN',
          applied_at: now,
        },
      ],
      updated_at: now,
    })
    .eq('id', payment.id);

  if (payError) return { error: payError.message };

  // Reflect final refund on the linked invoice (only once payment is successful).
  if (refund.status === 'success' && payment.invoice_id) {
    const { error: invError } = await supabase
      .from('invoices')
      .update({
        status: 'refunded',
        refunded_at: now,
        paystack_refund_id: String(refund.id),
      })
      .eq('id', payment.invoice_id)
      .eq('status', 'paid');

    if (invError) return { error: invError.message };
  }

  return {};
}

/**
 * Attempt to auto-match an unmatched payment to an invoice.
 * Priority: paystack_reference → external_invoice_id → amount+org+close date.
 * Returns 'matched' | 'unmatched' | 'mismatch'.
 */
export async function autoMatchPayment(
  supabase: SupabaseClient,
  payment: Record<string, any>,
): Promise<'matched' | 'unmatched' | 'mismatch'> {
  if (payment.invoice_id) return 'matched';

  let invoiceId: string | null = null;

  const { data: byRef } = payment.reference
    ? await supabase
        .from('invoices')
        .select('id')
        .eq('paystack_reference', payment.reference)
        .eq('org_id', payment.org_id)
        .maybeSingle()
    : { data: null };
  if (byRef) {
    invoiceId = byRef.id;
  } else if (payment.paystack_transaction_id) {
    const { data: byTx } = await supabase
      .from('invoices')
      .select('id')
      .eq('external_invoice_id', String(payment.paystack_transaction_id))
      .eq('org_id', payment.org_id)
      .maybeSingle();
    if (byTx) invoiceId = byTx.id;
  }

  if (invoiceId) {
    await supabase
      .from('payments')
      .update({ invoice_id: invoiceId, reconciliation_status: 'matched', reconciled_at: new Date().toISOString() })
      .eq('id', payment.id);
    return 'matched';
  }

  // Amount + org + close-date heuristic (only for paid Paystack invoices).
  const paidAt = payment.paid_at ? new Date(payment.paid_at) : null;
  if (paidAt) {
    const from = new Date(paidAt.getTime() - 2 * 86400000).toISOString();
    const to = new Date(paidAt.getTime() + 2 * 86400000).toISOString();
    const { data: candidate } = await supabase
      .from('invoices')
      .select('id, amount, paystack_reference')
      .eq('org_id', payment.org_id)
      .eq('status', 'paid')
      .gte('invoice_date', from)
      .lte('invoice_date', to)
      .limit(10);
    const match = (candidate ?? []).find(
      (inv: any) => Number(inv.amount) === Number(payment.amount) && !inv.paystack_reference,
    );
    if (match) {
      await supabase
        .from('payments')
        .update({ invoice_id: match.id, reconciliation_status: 'matched', reconciled_at: new Date().toISOString() })
        .eq('id', payment.id);
      return 'matched';
    }
  }

  return 'unmatched';
}