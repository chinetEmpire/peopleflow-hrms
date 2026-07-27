import { type Role } from './supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

export const VALID_ROLES: Role[] = ['employee', 'manager', 'hr_admin', 'super_admin'];
export const VALID_PLANS = ['free', 'starter', 'pro', 'enterprise'] as const;
export const VALID_BILLING_CYCLES = ['monthly', 'yearly'] as const;
export const VALID_INVOICE_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'void'] as const;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_TRIAL_DAYS = 90;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isValidRole(role: unknown): role is Role {
  return typeof role === 'string' && (VALID_ROLES as readonly string[]).includes(role);
}

export function isValidPlan(plan: unknown): plan is typeof VALID_PLANS[number] {
  return typeof plan === 'string' && (VALID_PLANS as readonly string[]).includes(plan);
}

export function isValidBillingCycle(cycle: unknown): cycle is typeof VALID_BILLING_CYCLES[number] {
  return typeof cycle === 'string' && (VALID_BILLING_CYCLES as readonly string[]).includes(cycle);
}

export function isValidInvoiceStatus(status: unknown): status is typeof VALID_INVOICE_STATUSES[number] {
  return typeof status === 'string' && (VALID_INVOICE_STATUSES as readonly string[]).includes(status);
}

export function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value) && value > 0;
}

export function isValidMaxEmployees(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= -1;
}

export function isValidTrialDays(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= MAX_TRIAL_DAYS;
}

export function isValidPassword(password: unknown): { valid: boolean; error?: string } {
  if (typeof password !== 'string') return { valid: false, error: 'Password must be a string' };
  if (password.length < MIN_PASSWORD_LENGTH) return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  return { valid: true };
}

/**
 * Pick only allowed keys from an object.
 * Prevents mass assignment attacks.
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}
