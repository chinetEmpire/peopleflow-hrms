import { NextResponse } from 'next/server';
import { getSupabaseAdmin, verifySuperAdmin } from '@/lib/supabase-admin';
import { checkRateLimit } from '@/lib/rate-limit';

const VALID_PAYMENT_STATUSES = ['success', 'pending', 'failed', 'partial_refund', 'refunded'] as const;
const VALID_RECON_STATUSES = ['matched', 'unmatched', 'mismatch', 'manual'] as const;

function pickQueryString(params: URLSearchParams, key: string): string | null {
  const v = params.get(key);
  return v && v.length > 0 ? v : null;
}

export async function GET(req: Request) {
  try {
    const auth = await verifySuperAdmin(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const limit = checkRateLimit(`payments-list:${auth.user.id}:${ip}`, 'admin');
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const supabase = getSupabaseAdmin();
    const url = new URL(req.url);
    const status = pickQueryString(url.searchParams, 'status');
    const recon = pickQueryString(url.searchParams, 'reconciliation_status');
    const orgId = pickQueryString(url.searchParams, 'org_id');
    const from = pickQueryString(url.searchParams, 'from');
    const to = pickQueryString(url.searchParams, 'to');
    const search = pickQueryString(url.searchParams, 'search');
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '25') || 25));

    const paymentId = pickQueryString(url.searchParams, 'payment_id');
    if (paymentId) {
      const { data: single, error: singleError } = await supabase
        .from('payments')
        .select(
          `*,
           organizations!payments_org_id_fkey (id, name, slug, logo_url, primary_color),
           invoices!payments_invoice_id_fkey (id, amount, status, description, invoice_date, paystack_reference),
           subscriptions!payments_subscription_id_fkey (id, plan_id, status, billing_cycle)`,
        )
        .eq('id', paymentId)
        .maybeSingle();
      if (singleError) throw singleError;
      if (!single) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      return NextResponse.json({ payments: [single], summary: null, page: 1, pageSize: 1, total: 1 });
    }

    let query = supabase.from('payments').select(
      `*,
       organizations!payments_org_id_fkey (id, name, slug, logo_url, primary_color),
       invoices!payments_invoice_id_fkey (id, amount, description, status, invoice_date),
       subscriptions!payments_subscription_id_fkey (id, plan_id, status, billing_cycle)`,
      { count: 'exact' },
    );

    if (status) query = query.eq('status', status);
    if (recon) query = query.eq('reconciliation_status', recon);
    if (orgId) query = query.eq('org_id', orgId);
    if (from) query = query.gte('paid_at', new Date(from).toISOString());
    if (to) query = query.lte('paid_at', new Date(to).toISOString());

    // We need the full filtered set for accurate summaries, so pull the bounded window
    // for the table and a separate aggregate pass for the summary.
    const { data, count, error } = await query
      .order('paid_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;

    let summary = { total: 0, paidAmount: 0, pendingAmount: 0, refundedAmount: 0, matched: 0, unmatched: 0 };
    if (count === 0) {
      return NextResponse.json({ payments: [], summary, page, pageSize, total: 0 });
    }

    // Aggregate summary (server-side, all matching rows). MVP scale acceptable.
    const { data: allRows } = await (async () => {
      let q = supabase.from('payments').select('amount, refunded_amount, status, reconciliation_status');
      if (status) q = q.eq('status', status);
      if (recon) q = q.eq('reconciliation_status', recon);
      if (orgId) q = q.eq('org_id', orgId);
      if (from) q = q.gte('paid_at', new Date(from).toISOString());
      if (to) q = q.lte('paid_at', new Date(to).toISOString());
      if (search) return { data: [] };
      return await q.limit(2000);
    })();

    if (allRows) {
      summary = allRows.reduce(
        (acc, r: any) => {
          const amount = Number(r.amount ?? 0);
          const refunded = Number(r.refunded_amount ?? 0);
          acc.total += 1;
          if (r.status === 'pending' || r.status === 'failed') acc.pendingAmount += amount;
          else acc.paidAmount += amount;
          acc.refundedAmount += refunded;
          if (r.reconciliation_status === 'matched') acc.matched += 1;
          if (r.reconciliation_status === 'unmatched') acc.unmatched += 1;
          return acc;
        },
        { total: 0, paidAmount: 0, pendingAmount: 0, refundedAmount: 0, matched: 0, unmatched: 0 },
      );
    }

    return NextResponse.json({ payments: data ?? [], summary, page, pageSize, total: count ?? 0 });
  } catch (err) {
    console.error('[admin/payments] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await verifySuperAdmin(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { payment_id, invoice_id, reconciliation_status, notes } = body;

    if (!payment_id || typeof payment_id !== 'string') {
      return NextResponse.json({ error: 'Missing payment_id' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (reconciliation_status !== undefined) {
      if (!(VALID_RECON_STATUSES as readonly string[]).includes(reconciliation_status)) {
        return NextResponse.json({ error: 'Invalid reconciliation_status' }, { status: 400 });
      }
      updates.reconciliation_status = reconciliation_status;
    }

    if (invoice_id !== undefined) {
      if (invoice_id === null) {
        updates.invoice_id = null;
        updates.reconciliation_status = updates.reconciliation_status ?? 'unmatched';
        updates.reconciled_at = null;
      } else if (typeof invoice_id === 'string') {
        const { data: invoice } = await supabase.from('invoices').select('id').eq('id', invoice_id).maybeSingle();
        if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        updates.invoice_id = invoice_id;
      } else {
        return NextResponse.json({ error: 'Invalid invoice_id' }, { status: 400 });
      }
    }

    if (notes !== undefined) {
      if (typeof notes !== 'string' || notes.length > 2000) {
        return NextResponse.json({ error: 'Invalid notes' }, { status: 400 });
      }
      updates.reconciliation_notes = notes || null;
    }

    if (updates.reconciliation_status === 'matched' && updates.invoice_id === undefined) {
      const { data: existing } = await supabase.from('payments').select('invoice_id').eq('id', payment_id).maybeSingle();
      if (!existing?.invoice_id) {
        return NextResponse.json({ error: 'Cannot mark matched without a linked invoice' }, { status: 400 });
      }
    }

    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('org_id')
      .eq('id', payment_id)
      .maybeSingle();
    if (fetchError || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const { error } = await supabase.from('payments').update(updates).eq('id', payment_id);
    if (error) throw error;

    await supabase.from('audit_logs').insert({
      actor_id: auth.user.id,
      org_id: payment.org_id,
      action: 'reconcile_update',
      entity: 'payment',
      entity_id: payment_id,
      details: { updates },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/payments] PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}