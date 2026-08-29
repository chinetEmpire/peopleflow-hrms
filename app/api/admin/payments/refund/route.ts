import { NextResponse } from 'next/server';
import { getSupabaseAdmin, verifySuperAdmin } from '@/lib/supabase-admin';
import { refundPaystackTransaction, isPaystackConfigured } from '@/lib/paystack';
import { checkRateLimit } from '@/lib/rate-limit';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function POST(req: Request) {
  try {
    const auth = await verifySuperAdmin(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limit = checkRateLimit(`payments-refund:${auth.user.id}`, 'admin');
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    if (!isPaystackConfigured()) {
      return NextResponse.json({ error: 'Paystack is not configured. Refunds unavailable.' }, { status: 400 });
    }

    const body = await req.json();
    const { payment_id, amount, note, confirm } = body;

    if (!payment_id || typeof payment_id !== 'string') {
      return NextResponse.json({ error: 'Missing payment_id' }, { status: 400 });
    }
    if (confirm !== true) {
      return NextResponse.json({ error: 'Refund must be explicitly confirmed' }, { status: 400 });
    }
    if (typeof note !== 'string' || note.trim().length < 3 || note.length > 500) {
      return NextResponse.json({ error: 'A short reason (3-500 chars) is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: payment, error: payError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .maybeSingle();
    if (payError || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    if (!['success', 'partial_refund'].includes(payment.status)) {
      return NextResponse.json({ error: 'Only successful payments can be refunded' }, { status: 400 });
    }
    if (!payment.reference) {
      return NextResponse.json({ error: 'Payment has no Paystack reference' }, { status: 400 });
    }

    const paidAmount = Number(payment.amount);
    const alreadyRefunded = Number(payment.refunded_amount ?? 0);
    const remaining = round2(paidAmount - alreadyRefunded);
    if (remaining <= 0) {
      return NextResponse.json({ error: 'This payment is already fully refunded' }, { status: 400 });
    }

    let refundAmount = remaining;
    if (amount !== undefined && amount !== null) {
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Invalid refund amount' }, { status: 400 });
      }
      refundAmount = round2(amount);
      if (refundAmount > remaining) {
        return NextResponse.json({ error: `Refund amount exceeds remaining refundable (${remaining})` }, { status: 400 });
      }
    }

    const { refund, error: refundError } = await refundPaystackTransaction(payment.reference, { amount: refundAmount });
    if (refundError || !refund) {
      return NextResponse.json({ error: 'Refund could not be processed by Paystack' }, { status: 400 });
    }

    // Reflect the refund request in the ledger immediately; the webhook finalizes status.
    const history: any[] = Array.isArray(payment.refund_history) ? payment.refund_history : [];
    const nextRefunded = round2(alreadyRefunded + refundAmount);
    const finalStatus = refund.status === 'success' && nextRefunded >= paidAmount ? 'refunded' : 'partial_refund';

    await supabase
      .from('payments')
      .update({
        status: finalStatus,
        refund_reference: refund.reference ?? String(refund.id),
        refunded_amount: nextRefunded,
        refund_history: [
          ...history,
          {
            paystack_refund_id: refund.id,
            reference: refund.reference ?? null,
            status: refund.status, // processing | pending | success | failed
            amount: refundAmount,
            currency: payment.currency ?? 'NGN',
            initiated_by: auth.user.id,
            note: note.trim(),
            applied_at: new Date().toISOString(),
          },
        ],
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    // If Paystack already finalized the refund, mark the linked invoice.
    if (refund.status === 'success' && payment.invoice_id) {
      await supabase
        .from('invoices')
        .update({
          status: 'refunded',
          refunded_at: new Date().toISOString(),
          paystack_refund_id: String(refund.id),
        })
        .eq('id', payment.invoice_id)
        .eq('status', 'paid');
    }

    await supabase.from('audit_logs').insert({
      actor_id: auth.user.id,
      org_id: payment.org_id,
      action: 'refund',
      entity: 'payment',
      entity_id: payment.id,
      details: {
        payment_id: payment.id,
        reference: payment.reference,
        refund_id: refund.id,
        amount: refundAmount,
        note: note.trim(),
        paystack_status: refund.status,
      },
    });

    return NextResponse.json({
      success: true,
      refund_id: refund.id,
      status: refund.status,
      amount: refundAmount,
    });
  } catch (err) {
    console.error('[admin/payments/refund] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}