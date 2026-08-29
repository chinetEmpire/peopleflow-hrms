import { NextResponse } from 'next/server';
import { getSupabaseAdmin, verifySuperAdmin } from '@/lib/supabase-admin';
import { checkRateLimit } from '@/lib/rate-limit';

type Act = 'match' | 'ignore' | 'unlink';

export async function POST(req: Request) {
  try {
    const auth = await verifySuperAdmin(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limit = checkRateLimit(`payments-reconcile:${auth.user.id}`, 'admin');
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    const body = await req.json();
    const { payment_id, action, invoice_id, note } = body;

    if (!payment_id || typeof payment_id !== 'string') {
      return NextResponse.json({ error: 'Missing payment_id' }, { status: 400 });
    }
    if (!action || !['match', 'ignore', 'unlink'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    if (note !== undefined && (typeof note !== 'string' || note.length > 2000)) {
      return NextResponse.json({ error: 'Invalid note' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: payment, error: payError } = await supabase
      .from('payments')
      .select('id, org_id')
      .eq('id', payment_id)
      .maybeSingle();
    if (payError || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const act = action as Act;
    let updates: Record<string, unknown> = { updated_at: now };
    let auditDetails: Record<string, unknown> = { action, payment_id };

    if (act === 'match') {
      if (!invoice_id || typeof invoice_id !== 'string') {
        return NextResponse.json({ error: 'invoice_id required to match' }, { status: 400 });
      }
      const { data: invoice } = await supabase
        .from('invoices')
        .select('id, org_id')
        .eq('id', invoice_id)
        .maybeSingle();
      if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      if (invoice.org_id !== payment.org_id) {
        return NextResponse.json({ error: 'Invoice belongs to a different organization' }, { status: 400 });
      }
      updates.invoice_id = invoice_id;
      updates.reconciliation_status = 'matched';
      updates.reconciled_at = now;
      updates.reconciliation_notes = note ?? null;
      auditDetails.invoice_id = invoice_id;
    } else if (act === 'ignore') {
      updates.reconciliation_status = 'manual';
      updates.reconciled_at = now;
      updates.reconciliation_notes = note ?? null;
      auditDetails.note = note ?? null;
    } else {
      updates.invoice_id = null;
      updates.reconciliation_status = 'unmatched';
      updates.reconciled_at = null;
      updates.reconciliation_notes = null;
    }

    const { error } = await supabase.from('payments').update(updates).eq('id', payment_id);
    if (error) throw error;

    await supabase.from('audit_logs').insert({
      actor_id: auth.user.id,
      org_id: payment.org_id,
      action: 'reconcile',
      entity: 'payment',
      entity_id: payment_id,
      details: auditDetails,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/payments/reconcile] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}