import crypto from 'crypto';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY ?? '';
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY ?? '';
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET ?? '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const PAYSTACK_API = 'https://api.paystack.co';

export interface PaystackTransaction {
  id: number;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  customer: {
    id: number;
    email: string;
  } | null;
  authorization?: {
    authorization_code?: string;
  } | null;
}

export interface PaystackWebhookEvent {
  event: string;
  data: PaystackTransaction;
}

/**
 * Generate a unique transaction reference
 */
export function generatePaymentReference(prefix: string = 'PHMS'): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(6).toString('hex');
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Initialize Paystack Standard Checkout
 * Returns the authorization URL to redirect the user to
 * Amounts are converted to kobo (Paystack expects the minor unit)
 */
export async function createPaystackCheckout(payload: {
  amount: number;
  currency?: string;
  email: string;
  name?: string;
  reference: string;
  planName: string;
  callbackUrl?: string;
}): Promise<{ authorizationUrl: string; reference: string } | null> {
  try {
    const body = {
      email: payload.email,
      amount: Math.round(payload.amount * 100),
      currency: payload.currency ?? 'NGN',
      reference: payload.reference,
      callback_url: payload.callbackUrl ?? `${BASE_URL}/billing/success`,
      metadata: {
        custom_fields: [
          {
            display_name: 'Plan',
            variable_name: 'plan_name',
            value: payload.planName,
          },
        ],
      },
    };

    const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.status === true && data.data?.authorization_url) {
      return {
        authorizationUrl: data.data.authorization_url,
        reference: data.data.reference ?? payload.reference,
      };
    }

    console.error('Paystack checkout error:', data);
    return null;
  } catch (err) {
    console.error('Paystack checkout failed:', err);
    return null;
  }
}

/**
 * Verify a Paystack transaction
 */
export async function verifyPaystackTransaction(reference: string): Promise<PaystackTransaction | null> {
  try {
    const response = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json();

    if (data.status === true && data.data) {
      return data.data as PaystackTransaction;
    }

    return null;
  } catch (err) {
    console.error('Paystack verification failed:', err);
    return null;
  }
}

/**
 * Verify Paystack webhook signature
 * Uses the SHA512 hash of the secret key + request body
 * Returns false if webhook secret is not configured (fail-closed)
 */
export function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!PAYSTACK_WEBHOOK_SECRET || !signature) return false;
  const hash = crypto.createHmac('sha512', PAYSTACK_WEBHOOK_SECRET).update(body).digest('hex');
  if (hash.length !== signature.length) return false;
  const hashBuf = new TextEncoder().encode(hash);
  const sigBuf = new TextEncoder().encode(signature);
  return crypto.timingSafeEqual(hashBuf, sigBuf);
}

/**
 * Check if Paystack is configured (has API keys)
 */
export function isPaystackConfigured(): boolean {
  return !!PAYSTACK_SECRET_KEY && !!PAYSTACK_PUBLIC_KEY;
}

export { PAYSTACK_PUBLIC_KEY };