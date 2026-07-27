import { NextResponse } from 'next/server';
import { getSupabaseAdmin, verifySuperAdmin } from '@/lib/supabase-admin';
import { isValidAmount, isValidInvoiceStatus } from '@/lib/validation';

export async function GET(req: Request) {
  try {
    const result = await verifySuperAdmin(req);
    if (!result) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status');
    const orgFilter = url.searchParams.get('org_id');
    const limit = parseInt(url.searchParams.get('limit') ?? '100');

    let query = supabase
      .from('invoices')
      .select(`
        *,
        organizations!invoices_org_id_fkey (id, name, slug, logo_url, primary_color)
      `)
      .order('invoice_date', { ascending: false })
      .limit(limit);

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (orgFilter) {
      query = query.eq('org_id', orgFilter);
    }

    const { data: invoices, error } = await query;
    if (error) throw error;

    return NextResponse.json({ invoices: invoices ?? [] });
  } catch (err) {
    console.error('GET /api/admin/invoices error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const result = await verifySuperAdmin(req);
    if (!result) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { org_id, amount, currency, description, status, due_date } = body;

    if (!org_id || amount === undefined) {
      return NextResponse.json({ error: 'Missing org_id or amount' }, { status: 400 });
    }

    if (!isValidAmount(amount)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    let resolvedStatus = status ?? 'pending';
    if (status !== undefined) {
      if (!isValidInvoiceStatus(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      if (status === 'paid') {
        resolvedStatus = 'pending';
      }
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        org_id,
        amount,
        currency: currency ?? 'NGN',
        description: description ?? 'Manual invoice',
        status: resolvedStatus,
        invoice_date: now,
        due_date: due_date ?? null,
        payment_provider: 'manual',
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      actor_id: result.user.id,
      org_id,
      action: 'create',
      entity: 'invoice',
      entity_id: invoice.id,
      details: { amount, currency: currency ?? 'NGN', description },
    });

    return NextResponse.json({ success: true, invoice });
  } catch (err) {
    console.error('POST /api/admin/invoices error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const result = await verifySuperAdmin(req);
    if (!result) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { invoice_id, action } = body;
    if (!invoice_id || !action) {
      return NextResponse.json({ error: 'Missing invoice_id or action' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    let updateData: Record<string, any> = {};
    let auditDetails: Record<string, any> = { action, invoice_id };

    switch (action) {
      case 'mark_paid': {
        updateData.status = 'paid';
        updateData.paid_at = now;
        auditDetails.status_before = invoice.status;
        auditDetails.status_after = 'paid';
        break;
      }
      case 'void': {
        if (invoice.status === 'paid') {
          return NextResponse.json({ error: 'Cannot void a paid invoice. Use refund instead.' }, { status: 400 });
        }
        updateData.status = 'void';
        auditDetails.status_before = invoice.status;
        auditDetails.status_after = 'void';
        break;
      }
      case 'refund': {
        if (invoice.status !== 'paid') {
          return NextResponse.json({ error: 'Can only refund paid invoices' }, { status: 400 });
        }
        updateData.status = 'refunded';
        auditDetails.status_before = 'paid';
        auditDetails.status_after = 'refunded';
        break;
      }
      case 'update_due_date': {
        const { due_date } = body;
        updateData.due_date = due_date;
        auditDetails.due_date_before = invoice.due_date;
        auditDetails.due_date_after = due_date;
        break;
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoice_id);

    if (updateError) throw updateError;

    await supabase.from('audit_logs').insert({
      actor_id: result.user.id,
      org_id: invoice.org_id,
      action,
      entity: 'invoice',
      entity_id: invoice_id,
      details: auditDetails,
    });

    return NextResponse.json({ success: true, action, invoice_id });
  } catch (err) {
    console.error('PATCH /api/admin/invoices error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 },
    );
  }
}
