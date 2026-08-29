import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyWebhookSignature, verifyPaystackTransaction, type PaystackTransaction } from '@/lib/paystack';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

async function fulfillOrder(supabase: SupabaseClient, reference: string, transaction: PaystackTransaction) {
  // Check if already fulfilled
  const { data: existing } = await supabase
    .from('audit_logs')
    .select('id')
    .eq('entity', 'payment')
    .eq('entity_id', reference)
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
    .contains('details', { tx_ref: reference })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pendingLog || !pendingLog.org_id) {
    console.error('No pending payment found for reference:', reference);
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
      payment_provider: 'paystack',
      external_subscription_id: reference,
      paystack_reference: reference,
      paystack_customer_id: transaction.customer ? String(transaction.customer.id) : null,
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

  // Create invoice (Paystack amounts are in kobo, divide by 100 for naira)
  await supabase.from('invoices').insert({
    org_id: orgId,
    amount: transaction.amount / 100,
    currency: transaction.currency ?? 'NGN',
    status: 'paid',
    description: `${billingCycle} ${planId} plan payment`,
    invoice_date: now.toISOString(),
    paid_at: now.toISOString(),
    payment_provider: 'paystack',
    external_invoice_id: String(transaction.id),
    paystack_reference: reference,
  });

  // Log success
  await supabase.from('audit_logs').insert({
    actor_id: null,
    org_id: orgId,
    action: 'payment_success',
    entity: 'payment',
    entity_id: reference,
    details: {
      paystack_tx_id: transaction.id,
      amount: transaction.amount / 100,
      currency: transaction.currency ?? 'NGN',
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
    const signature = req.headers.get('x-paystack-signature');

    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'charge.success') {
      const transaction: PaystackTransaction = event.data;
      const reference = transaction.reference;

      // Verify the transaction with Paystack
      const verified = await verifyPaystackTransaction(reference);
      if (!verified || verified.status !== 'success') {
        console.error('Transaction verification failed for:', reference);
        return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
      }

      const supabase = getSupabaseAdmin();
      const result = await fulfillOrder(supabase, reference, verified);

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