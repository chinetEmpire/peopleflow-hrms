import { NextResponse } from 'next/server';
import { generateTxRef, createFlutterwaveCheckout, isFlutterwaveConfigured } from '@/lib/flutterwave';
import { getSupabaseAdmin, verifyHrAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(ip, 'auth');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      );
    }

    const auth = await verifyHrAdmin(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { user, profile } = auth;

    if (!isFlutterwaveConfigured()) {
      return NextResponse.json({
        error: 'Payment gateway not configured. Please contact support.',
        notConfigured: true,
      }, { status: 503 });
    }

    const body = await req.json();
    const { plan_id, billing_cycle } = body;

    if (!plan_id) {
      return NextResponse.json({ error: 'Missing plan_id' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const cycle = billing_cycle === 'yearly' ? 'yearly' : 'monthly';
    const amount = cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;

    if (amount <= 0) {
      return NextResponse.json({ error: 'Free plan does not require payment' }, { status: 400 });
    }

    const txRef = generateTxRef();
    const email = profile.email;
    const name = `${profile.first_name} ${profile.last_name}`.trim();

    const result = await createFlutterwaveCheckout({
      amount,
      currency: plan.currency ?? 'NGN',
      email,
      name,
      txRef,
      planName: plan.name,
    });

    if (!result) {
      return NextResponse.json({ error: 'Failed to initialize payment. Please try again.' }, { status: 500 });
    }

    // Store pending checkout
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      org_id: profile.org_id,
      action: 'initiate_payment',
      entity: 'subscription',
      details: {
        tx_ref: txRef,
        plan_id,
        billing_cycle: cycle,
        amount,
        currency: plan.currency ?? 'NGN',
      },
    });

    return NextResponse.json({
      success: true,
      checkout_url: result.checkoutUrl,
      tx_ref: txRef,
    });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    );
  }
}
