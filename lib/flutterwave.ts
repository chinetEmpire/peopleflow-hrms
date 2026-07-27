import crypto from 'crypto';

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY ?? '';
const FLUTTERWAVE_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY ?? '';
const FLUTTERWAVE_WEBHOOK_SECRET = process.env.FLUTTERWAVE_WEBHOOK_SECRET ?? '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export interface FlutterwaveCheckoutPayload {
  tx_ref: string;
  amount: number;
  currency: string;
  customer: {
    email: string;
    name?: string;
  };
  customizations?: {
    title?: string;
    description?: string;
    logo?: string;
  };
  redirect_url?: string;
  meta?: Record<string, any>;
}

export interface FlutterwaveTransaction {
  id: number;
  tx_ref: string;
  flw_ref: string;
  amount: number;
  currency: string;
  status: string;
  charged_amount: number;
  customer: {
    id: number;
    email: string;
    name: string;
  };
  created_at: string;
  meta?: Record<string, any>;
}

/**
 * Generate a unique transaction reference
 */
export function generateTxRef(prefix: string = 'PHMS'): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(6).toString('hex');
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Initialize Flutterwave Standard Checkout
 * Returns the checkout URL to redirect the user to
 */
export async function createFlutterwaveCheckout(payload: {
  amount: number;
  currency?: string;
  email: string;
  name?: string;
  txRef: string;
  planName: string;
  redirectUrl?: string;
}): Promise<{ checkoutUrl: string; txRef: string } | null> {
  try {
    const body: FlutterwaveCheckoutPayload = {
      tx_ref: payload.txRef,
      amount: payload.amount,
      currency: payload.currency ?? 'NGN',
      customer: {
        email: payload.email,
        name: payload.name,
      },
      customizations: {
        title: 'PeopleFlow HRMS',
        description: `${payload.planName} Plan Subscription`,
        logo: `${BASE_URL}/logo.png`,
      },
      redirect_url: payload.redirectUrl ?? `${BASE_URL}/billing/success`,
      meta: [{ metaname: 'plan_name', metavalue: payload.planName }],
    };

    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.status === 'success' && data.data?.link) {
      return {
        checkoutUrl: data.data.link,
        txRef: payload.txRef,
      };
    }

    console.error('Flutterwave checkout error:', data);
    return null;
  } catch (err) {
    console.error('Flutterwave checkout failed:', err);
    return null;
  }
}

/**
 * Verify a Flutterwave transaction
 */
export async function verifyFlutterwaveTransaction(txRef: string): Promise<FlutterwaveTransaction | null> {
  try {
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        },
      },
    );

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      return data.data as FlutterwaveTransaction;
    }

    return null;
  } catch (err) {
    console.error('Flutterwave verification failed:', err);
    return null;
  }
}

/**
 * Verify Flutterwave webhook signature
 * Uses the SHA512 hash of the secret key + request body
 * Returns false if webhook secret is not configured (fail-closed)
 */
export function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!FLUTTERWAVE_WEBHOOK_SECRET || !signature) return false;
  const hash = crypto.createHmac('sha512', FLUTTERWAVE_WEBHOOK_SECRET).update(body).digest('hex');
  if (hash.length !== signature.length) return false;
  const hashBuf = new TextEncoder().encode(hash);
  const sigBuf = new TextEncoder().encode(signature);
  return crypto.timingSafeEqual(hashBuf, sigBuf);
}

/**
 * Check if Flutterwave is configured (has API keys)
 */
export function isFlutterwaveConfigured(): boolean {
  return !!FLUTTERWAVE_SECRET_KEY && !!FLUTTERWAVE_PUBLIC_KEY;
}

export { FLUTTERWAVE_PUBLIC_KEY };
