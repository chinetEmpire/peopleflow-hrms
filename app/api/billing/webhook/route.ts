import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyWebhookSignature, verifyFlutterwaveTransaction, type FlutterwaveTransaction } from '@/lib/flutterwave';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

async function fulfillOrder(supabase: SupabaseClient, txRef: string, transaction: FlutterwaveTransaction) {
  // Check if already fulfilled
  const { data: existing } = await supabase
    .from('audit_logs')
    .select('id')
    .eq('entity', 'payment')
    .eq('entity_id', txRef)
    .eq('action', 'payment_success')
    .maybeSingle();

  if (existing) {
    return { alreadyProcessed: true };
  }

  // Find the pending payment from audit logs
  const { data: pendingLog } = await supabase
    .from('audit_logs')
    .select('org_id, details')
    .eq('entity', 'subscription')
    .eq('action', 'initiate_payment')
    .contains('details', { tx_ref: txRef })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pendingLog || !pendingLog.org_id) {
    console.error('No pending payment found for tx_ref:', txRef);
    return { error: 'No pending payment found' };
  }

  const orgId = pendingLog.org_id;
  const details = pendingLog.details as any;
  const planId = details.plan_id;
  const billingCycle = details.billing_cycle ?? 'monthly';

  // Calculate period end
  const now = new Date();
  const periodEnd = new Date(now);
  if (billingCycle === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // Upsert subscription
  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert({
      org_id: orgId,
      plan_id: planId,
      status: 'active',
      billing_cycle: billingCycle,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      payment_provider: 'flutterwave',
      external_subscription_id: txRef,
      flutterwave_tx_ref: txRef,
      flutterwave_customer_id: String(transaction.customer.id),
      canceled_at: null,
      updated_at: now.toISOString(),
    }, { onConflict: 'org_id' });

  if (subError) {
    console.error('Error upserting subscription:', subError);
    return { error: subError.message };
  }

  // Update organization plan
  const { data: plan } = await supabase
    .from('plans')
    .select('max_employees')
    .eq('id', planId)
    .single();

  if (plan) {
    await supabase
      .from('organizations')
      .update({
        plan: planId,
        max_employees: plan.max_employees,
        updated_at: now.toISOString(),
      })
      .eq('id', orgId);
  }

  // Create invoice
  await supabase.from('invoices').insert({
    org_id: orgId,
    amount: transaction.amount,
    currency: transaction.currency,
    status: 'paid',
    description: `${billingCycle} ${planId} plan payment`,
    invoice_date: now.toISOString(),
    paid_at: now.toISOString(),
    payment_provider: 'flutterwave',
    external_invoice_id: transaction.flw_ref,
    flutterwave_tx_ref: txRef,
    flutterwave_flw_ref: transaction.flw_ref,
  });

  // Log success
  await supabase.from('audit_logs').insert({
    actor_id: null,
    org_id: orgId,
    action: 'payment_success',
    entity: 'payment',
    entity_id: txRef,
    details: {
      flw_ref: transaction.flw_ref,
      amount: transaction.amount,
      currency: transaction.currency,
      plan_id: planId,
      billing_cycle: billingCycle,
    },
  });

  return { success: true, orgId };
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(ip, 'webhook');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      );
    }

    const rawBody = await req.text();
    const signature = req.headers.get('flutterwave-signature');

    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'charge.completed') {
      const transaction: FlutterwaveTransaction = event.data;
      const txRef = transaction.tx_ref;

      // Verify the transaction with Flutterwave
      const verified = await verifyFlutterwaveTransaction(txRef);
      if (!verified || verified.status !== 'successful') {
        console.error('Transaction verification failed for:', txRef);
        return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
      }

      const supabase = getSupabaseAdmin();
      const result = await fulfillOrder(supabase, txRef, verified);

      return NextResponse.json({ received: true, ...result });
    }

    // Acknowledge other events
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 },
    );
  }
}
