import { getSupabase } from './supabase';

// ─── Plan Types ──────────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  max_employees: number;
  max_departments: number;
  features: string[];
  is_popular: boolean;
  sort_order: number;
}

export interface Subscription {
  subscription_id: string;
  plan_id: string;
  plan_name: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  price_monthly: number;
  price_yearly: number;
  max_employees: number;
  max_departments: number;
  features: string[];
}

export interface OrgUsage {
  employee_count: number;
  department_count: number;
  plan_max_employees: number;
  plan_max_departments: number;
}

export interface Invoice {
  id: string;
  org_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  description: string | null;
  invoice_date: string;
  due_date: string | null;
  paid_at: string | null;
  payment_provider: string | null;
  created_at: string;
}

// ─── Plan Helpers ────────────────────────────────────────────────────────────

export function getPlanPrice(plan: Plan, cycle: 'monthly' | 'yearly'): number {
  return cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
}

export function formatPrice(amount: number, currency: string = 'NGN'): string {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function isUnlimited(max: number): boolean {
  return max === -1;
}

export function formatLimit(max: number): string {
  return isUnlimited(max) ? 'Unlimited' : max.toLocaleString();
}

export function getUsagePercentage(current: number, max: number): number {
  if (isUnlimited(max)) return 0;
  if (max === 0) return 100;
  return Math.min(100, Math.round((current / max) * 100));
}

export function isPlanActive(status: Subscription['status']): boolean {
  return status === 'active' || status === 'trialing';
}

// ─── Database Functions ──────────────────────────────────────────────────────

/**
 * Get all available plans
 */
export async function getPlans(): Promise<Plan[]> {
  const { data, error } = await getSupabase()
    .from('plans')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching plans:', error);
    return [];
  }

  return data as Plan[];
}

/**
 * Get current subscription for an organization
 */
export async function getCurrentSubscription(orgId: string): Promise<Subscription | null> {
  const { data, error } = await getSupabase()
    .rpc('get_current_subscription', { org_uuid: orgId })
    .maybeSingle();

  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }

  return data as Subscription | null;
}

/**
 * Get organization usage stats
 */
export async function getOrgUsage(orgId: string): Promise<OrgUsage | null> {
  const { data, error } = await getSupabase()
    .rpc('get_org_usage', { org_uuid: orgId })
    .maybeSingle();

  if (error) {
    console.error('Error fetching org usage:', error);
    return null;
  }

  return data as OrgUsage | null;
}

/**
 * Get invoices for an organization
 */
export async function getInvoices(orgId: string, limit: number = 12): Promise<Invoice[]> {
  const { data, error } = await getSupabase()
    .from('invoices')
    .select('*')
    .eq('org_id', orgId)
    .order('invoice_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }

  return data as Invoice[];
}

/**
 * Create a subscription (for super_admin or billing flow)
 */
export async function createSubscription(
  orgId: string,
  planId: string,
  billingCycle: 'monthly' | 'yearly' = 'monthly'
): Promise<Subscription | null> {
  const now = new Date();
  const periodEnd = new Date(now);
  if (billingCycle === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  const { data, error } = await getSupabase()
    .from('subscriptions')
    .upsert({
      org_id: orgId,
      plan_id: planId,
      status: 'active',
      billing_cycle: billingCycle,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      payment_provider: 'manual',
    }, { onConflict: 'org_id' })
    .select()
    .single();

  if (error) {
    console.error('Error creating subscription:', error);
    return null;
  }

  // Update org plan
  const plan = await getSupabase().from('plans').select('max_employees').eq('id', planId).single();
  if (plan.data) {
    await getSupabase()
      .from('organizations')
      .update({
        plan: planId,
        max_employees: plan.data.max_employees,
        subscription_id: data.id,
        updated_at: now.toISOString(),
      })
      .eq('id', orgId);
  }

  return data as Subscription;
}

/**
 * Update subscription plan
 */
export async function updateSubscriptionPlan(
  orgId: string,
  planId: string,
  billingCycle: 'monthly' | 'yearly'
): Promise<boolean> {
  const now = new Date();
  const periodEnd = new Date(now);
  if (billingCycle === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  const { error } = await getSupabase()
    .from('subscriptions')
    .update({
      plan_id: planId,
      billing_cycle: billingCycle,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('org_id', orgId);

  if (error) {
    console.error('Error updating subscription:', error);
    return false;
  }

  // Update org plan
  const plan = await getSupabase().from('plans').select('max_employees').eq('id', planId).single();
  if (plan.data) {
    await getSupabase()
      .from('organizations')
      .update({
        plan: planId,
        max_employees: plan.data.max_employees,
        updated_at: now.toISOString(),
      })
      .eq('id', orgId);
  }

  return true;
}

/**
 * Check if org can add more employees based on current subscription
 */
export async function canAddEmployeeBilling(orgId: string): Promise<{ allowed: boolean; current: number; max: number }> {
  const usage = await getOrgUsage(orgId);
  if (!usage) return { allowed: false, current: 0, max: 0 };

  if (usage.plan_max_employees === -1) {
    return { allowed: true, current: usage.employee_count, max: -1 };
  }

  return {
    allowed: usage.employee_count < usage.plan_max_employees,
    current: usage.employee_count,
    max: usage.plan_max_employees,
  };
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(orgId: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('org_id', orgId);

  if (error) {
    console.error('Error canceling subscription:', error);
    return false;
  }

  return true;
}
