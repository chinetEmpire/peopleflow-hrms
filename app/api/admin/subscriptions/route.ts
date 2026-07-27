import { NextResponse } from 'next/server';
import { getSupabaseAdmin, verifySuperAdmin } from '@/lib/supabase-admin';
import { isValidTrialDays, isValidBillingCycle } from '@/lib/validation';

export async function GET(req: Request) {
  try {
    const auth = await verifySuperAdmin(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const url = new URL(req.url);
    const subId = url.searchParams.get('id');
    const statusFilter = url.searchParams.get('status');
    const planFilter = url.searchParams.get('plan');

    // Single subscription detail view
    if (subId) {
      const { data: sub, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          organizations!subscriptions_org_id_fkey (id, name, slug, plan, logo_url, primary_color, max_employees, billing_email)
        `)
        .eq('id', subId)
        .single();

      if (error || !sub) {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }

      const [
        { count: employeeCount },
        { data: invoices },
        { data: auditLogs },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('org_id', sub.org_id),
        supabase.from('invoices')
          .select('id, amount, currency, status, description, invoice_date, paid_at')
          .eq('org_id', sub.org_id)
          .order('invoice_date', { ascending: false })
          .limit(50),
        supabase.from('audit_logs')
          .select('id, action, entity, details, created_at, profiles!audit_logs_actor_id_fkey (first_name, last_name)')
          .eq('org_id', sub.org_id)
          .eq('entity', 'subscription')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      return NextResponse.json({
        subscription: {
          ...sub,
          employee_count: employeeCount ?? 0,
          invoice_count: invoices?.length ?? 0,
          invoices: invoices ?? [],
        },
        audit_logs: auditLogs ?? [],
      });
    }

    // List view
    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        organizations!subscriptions_org_id_fkey (id, name, slug, plan, logo_url, primary_color, max_employees, billing_email)
      `)
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (planFilter && planFilter !== 'all') {
      query = query.eq('plan_id', planFilter);
    }

    const { data: subs, error } = await query;
    if (error) throw error;

    const enriched = await Promise.all(
      (subs ?? []).map(async (sub: any) => {
        const [
          { count: invoiceCount },
          { count: employeeCount },
        ] = await Promise.all([
          supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('subscription_id', sub.id),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('org_id', sub.org_id),
        ]);

        return {
          ...sub,
          invoice_count: invoiceCount ?? 0,
          employee_count: employeeCount ?? 0,
        };
      })
    );

    return NextResponse.json({ subscriptions: enriched });
  } catch (err) {
    console.error('[admin/subscriptions] GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await verifySuperAdmin(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { subscription_id, action } = body;
    if (!subscription_id || !action) {
      return NextResponse.json({ error: 'Missing subscription_id or action' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    // Fetch current subscription
    const { data: sub, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*, organizations!subscriptions_org_id_fkey (name, plan)')
      .eq('id', subscription_id)
      .single();

    if (fetchError || !sub) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    let updateData: Record<string, any> = { updated_at: now };
    let auditDetails: Record<string, any> = { action, subscription_id };

    switch (action) {
      case 'suspend': {
        if (sub.status === 'canceled') {
          return NextResponse.json({ error: 'Cannot suspend a canceled subscription' }, { status: 400 });
        }
        updateData.status = 'paused';
        auditDetails.status_before = sub.status;
        auditDetails.status_after = 'paused';
        break;
      }
      case 'reactivate': {
        if (sub.status !== 'paused' && sub.status !== 'canceled') {
          return NextResponse.json({ error: 'Can only reactivate paused or canceled subscriptions' }, { status: 400 });
        }
        updateData.status = 'active';
        updateData.canceled_at = null;
        // Extend period end by 1 month from now
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        updateData.current_period_start = now;
        updateData.current_period_end = periodEnd.toISOString();
        auditDetails.status_before = sub.status;
        auditDetails.status_after = 'active';
        break;
      }
      case 'extend_trial': {
        const { trial_days } = body;
        if (trial_days !== undefined && !isValidTrialDays(trial_days)) {
          return NextResponse.json({ error: 'Invalid trial days' }, { status: 400 });
        }
        const days = trial_days || 14;
        updateData.status = 'trialing';
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + days);
        updateData.trial_ends_at = trialEnd.toISOString();
        // Also extend period
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + days);
        updateData.current_period_end = periodEnd.toISOString();
        auditDetails.trial_days = days;
        auditDetails.trial_ends_at = trialEnd.toISOString();
        break;
      }
      case 'change_cycle': {
        const { billing_cycle } = body;
        if (!isValidBillingCycle(billing_cycle)) {
          return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 });
        }
        updateData.billing_cycle = billing_cycle;
        // Reset period
        const periodEnd = new Date();
        if (billing_cycle === 'yearly') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }
        updateData.current_period_start = now;
        updateData.current_period_end = periodEnd.toISOString();
        auditDetails.billing_cycle_before = sub.billing_cycle;
        auditDetails.billing_cycle_after = billing_cycle;
        break;
      }
      case 'cancel': {
        updateData.status = 'canceled';
        updateData.canceled_at = now;
        auditDetails.status_before = sub.status;
        auditDetails.status_after = 'canceled';
        break;
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscription_id);

    if (updateError) throw updateError;

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: auth.user.id,
      org_id: sub.org_id,
      action: action,
      entity: 'subscription',
      entity_id: subscription_id,
      details: auditDetails,
    });

    return NextResponse.json({ success: true, action, subscription_id });
  } catch (err) {
    console.error('[admin/subscriptions] PATCH error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
