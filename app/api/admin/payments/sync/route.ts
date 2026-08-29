import { NextResponse } from 'next/server';
import { getSupabaseAdmin, verifySuperAdmin } from '@/lib/supabase-admin';
import { listPaystackTransactions } from '@/lib/paystack';
import { isPaystackConfigured } from '@/lib/paystack';
import { recordPayment, autoMatchPayment } from '@/lib/platform-payments';
import { checkRateLimit } from '@/lib/rate-limit';

const MAX_SYNC_RANGE_DAYS = 90;
const MAX_PAGES = 20;

function toDateOnlyParam(value: string | null, fallback: Date): string {
  if (!value) return fallback.toISOString().slice(0, 10);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback.toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  try {
    const auth = await verifySuperAdmin(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limit = checkRateLimit(`payments-sync:${auth.user.id}`, 'admin');
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    if (!isPaystackConfigured()) {
      return NextResponse.json({ error: 'Paystack is not configured. Add PAYSTACK_SECRET_KEY / PAYSTACK_PUBLIC_KEY.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const fromParam = body.from ?? null;
    const toParam = body.to ?? null;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    const toDate = new Date();

    const from = toDateOnlyParam(fromParam, fromDate);
    const to = toDateOnlyParam(toParam, toDate);

    if (from > to) {
      return NextResponse.json({ error: 'from must be before or equal to to' }, { status: 400 });
    }
    if (new Date(to).getTime() - new Date(from).getTime() > MAX_SYNC_RANGE_DAYS * 86400000) {
      return NextResponse.json({ error: `Sync range cannot exceed ${MAX_SYNC_RANGE_DAYS} days` }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Build reference → org lookup from pending payment initiation logs.
    const { data: initLogs } = await supabase
      .from('audit_logs')
      .select('org_id, details')
      .eq('entity', 'subscription')
      .eq('action', 'initiate_payment')
      .gte('created_at', new Date(from).toISOString())
      .lte('created_at', new Date(`${to}T23:59:59.999Z`).toISOString())
      .limit(1000);

    const refMap = new Map<string, { org_id: string; plan_id?: string; billing_cycle?: string }>();
    for (const log of initLogs ?? []) {
      const ref = (log.details as any)?.tx_ref;
      if (ref && log.org_id) {
        refMap.set(ref, {
          org_id: log.org_id,
          plan_id: (log.details as any)?.plan_id,
          billing_cycle: (log.details as any)?.billing_cycle,
        });
      }
    }

    // Fallback: org lookup by invoice reference for transactions without an initiation log.
    const { data: paystackInvoices } = await supabase
      .from('invoices')
      .select('org_id, paystack_reference')
      .eq('payment_provider', 'paystack')
      .not('paystack_reference', 'is', null)
      .limit(1000);
    const invoiceRefMap = new Map<string, string>();
    for (const inv of paystackInvoices ?? []) {
      if (inv.paystack_reference && inv.org_id) invoiceRefMap.set(inv.paystack_reference, inv.org_id);
    }

    let page = 1;
    let processed = 0;
    let recorded = 0;
    let matched = 0;
    let skippedNoOrg = 0;
    let skippedFailed = 0;

    while (page <= MAX_PAGES) {
      const result = await listPaystackTransactions({ from, to, status: 'success', perPage: 100, page });

      if (result.transactions.length === 0) break;
      page += 1;

      for (const txn of result.transactions) {
        processed += 1;
        const orgId = refMap.get(txn.reference)?.org_id ?? invoiceRefMap.get(txn.reference);
        if (!orgId) {
          skippedNoOrg += 1;
          continue;
        }

        const meta = refMap.get(txn.reference);
        const recordResult = await recordPayment(supabase, {
          orgId,
          transaction: txn,
          planId: meta?.plan_id ?? null,
          billingCycle: meta?.billing_cycle ?? null,
        });
        if (recordResult.error) {
          console.error(`Sync: failed to record ${txn.reference}:`, recordResult.error);
          skippedFailed += 1;
          continue;
        }
        recorded += 1;

        const reconciliation = await autoMatchPayment(supabase, {
          id: null,
          reference: txn.reference,
          paystack_transaction_id: txn.id,
          org_id: orgId,
          amount: (txn.amount ?? 0) / 100,
          paid_at: txn.paid_at ?? txn.created_at ?? new Date().toISOString(),
          invoice_id: null,
        });
        if (reconciliation === 'matched') matched += 1;
      }

      if (page > (result.totalPages || 0)) break;
    }

    return NextResponse.json({ success: true, counts: { processed, recorded, matched, skippedNoOrg, skippedFailed } });
  } catch (err) {
    console.error('[admin/payments/sync] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}