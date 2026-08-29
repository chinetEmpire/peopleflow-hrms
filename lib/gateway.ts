/**
 * Client-safe helper to check whether the payment gateway is configured.
 * The Paystack secret key is server-only, so the check runs server-side
 * via /api/billing/gateway-status and only the boolean reaches the browser.
 */
export async function getGatewayStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/billing/gateway-status', { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.configured === true;
  } catch {
    return false;
  }
}