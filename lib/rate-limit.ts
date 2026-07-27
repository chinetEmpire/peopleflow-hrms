/**
 * Simple in-memory rate limiter for API routes.
 * Suitable for single-instance deployments (Vercel serverless).
 * For multi-instance, use Upstash Redis or similar.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

const PRESETS: Record<string, RateLimitConfig> = {
  /** General API — 100 req/min */
  default: { maxRequests: 100, windowSeconds: 60 },
  /** Auth endpoints (register, checkout) — 10 req/min */
  auth: { maxRequests: 10, windowSeconds: 60 },
  /** Webhook endpoints — 50 req/min */
  webhook: { maxRequests: 50, windowSeconds: 60 },
  /** Admin endpoints — 60 req/min */
  admin: { maxRequests: 60, windowSeconds: 60 },
};

/**
 * Check rate limit for a given key (typically IP address).
 * Returns { allowed: true } if within limit, or { allowed: false, retryAfter } if exceeded.
 */
export function checkRateLimit(
  key: string,
  preset: keyof typeof PRESETS = 'default',
): { allowed: true; remaining: number } | { allowed: false; retryAfter: number } {
  const config = PRESETS[preset] ?? PRESETS.default;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count };
}

/**
 * Get client IP from request headers.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
