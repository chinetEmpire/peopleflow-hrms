'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import {
  getCurrentSubscription,
  getSubscriptionRow,
  getOrgUsage,
  getInvoices,
  formatPrice,
  formatLimit,
  getUsagePercentage,
  isUnlimited,
  isPlanActive,
  type Subscription,
  type OrgUsage,
  type Invoice,
} from '@/lib/billing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CreditCard,
  Users,
  Building2,
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Download,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { isPaystackConfigured } from '@/lib/paystack';

export default function BillingPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { organization } = useTenant();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [pendingSub, setPendingSub] = useState<{ plan_id: string; status: string; billing_cycle: string } | null>(null);
  const [usage, setUsage] = useState<OrgUsage | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [paymentConfigured, setPaymentConfigured] = useState<boolean>(false);

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      router.replace('/login');
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!profile?.org_id) return;

    async function loadBillingData() {
      setLoadingData(true);
      const [sub, rawSub, usageData, invoiceData] = await Promise.all([
        getCurrentSubscription(profile!.org_id),
        getSubscriptionRow(profile!.org_id),
        getOrgUsage(profile!.org_id),
        getInvoices(profile!.org_id),
      ]);
      setSubscription(sub);
      setPendingSub(rawSub?.status === 'pending' ? rawSub : null);
      setUsage(usageData);
      setInvoices(invoiceData);
      setPaymentConfigured(isPaystackConfigured());
      setLoadingData(false);
    }

    loadBillingData();
  }, [profile?.org_id]);

  if (loading || loadingData) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0e3a94]" />
      </div>
    );
  }

  const isPending = pendingSub !== null;
  const planName = subscription?.plan_name || (organization?.plan === 'pro' ? 'Professional' : organization?.plan === 'starter' ? 'Starter' : 'Free');
  const planStatus = subscription?.status || (isPending ? 'pending' : 'active');
  const employeeUsage = usage?.employee_count || 0;
  const employeeMax = usage?.plan_max_employees ?? organization?.max_employees ?? 10;
  const departmentUsage = usage?.department_count || 0;
  const departmentMax = usage?.plan_max_departments ?? 3;
  const employeePercent = getUsagePercentage(employeeUsage, employeeMax);
  const departmentPercent = getUsagePercentage(departmentUsage, departmentMax);
  const isAtLimit = employeePercent >= 90 && !isUnlimited(employeeMax);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-[#051536]">Billing & Subscription</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Manage your plan, usage, and invoices
          </p>
        </div>
        <Button
          onClick={() => router.push('/billing/upgrade')}
          className="rounded-lg bg-[#032364] hover:bg-[#032364]/90"
        >
          <ArrowUpRight className="mr-2 h-4 w-4" />
          Upgrade Plan
        </Button>
      </div>

      {/* Current Plan */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#032364]/10">
              <CreditCard className="h-4 w-4 text-[#032364]" />
            </div>
            <h2 className="text-sm font-semibold text-[#051536]">Current Plan</h2>
          </div>

          {/* Subscription Status Warnings */}
          {subscription && !isPlanActive(subscription.status) && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700">
                  {subscription.status === 'past_due' && 'Your subscription is past due. Please renew to avoid service interruption.'}
                  {subscription.status === 'canceled' && 'Your subscription has been canceled. Please contact support to reinstate.'}
                  {subscription.status === 'paused' && 'Your subscription is paused. Employee creation and certain features are disabled.'}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  Contact your platform administrator or{' '}
                  <Button variant="link" className="h-auto p-0 text-xs text-red-600 underline" onClick={() => router.push('/billing/upgrade')}>
                    upgrade your plan
                  </Button>
                </p>
              </div>
            </div>
          )}

          {isPending && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700">
                  Your {planName} plan is awaiting payment.
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Complete your payment to unlock employee management and all plan features.{' '}
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs text-amber-700 underline"
                    onClick={() => router.push('/billing/upgrade')}
                  >
                    Pay now
                  </Button>
                </p>
              </div>
            </div>
          )}

          {subscription && isPlanActive(subscription.status) && subscription.current_period_end && (() => {
            const daysUntilRenewal = Math.ceil(
              (new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            if (daysUntilRenewal <= 7 && daysUntilRenewal > 0) {
              return (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-700">
                    Your subscription renews in {daysUntilRenewal} day{daysUntilRenewal !== 1 ? 's' : ''}.
                  </p>
                </div>
              );
            }
            if (daysUntilRenewal <= 0) {
              return (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <p className="text-sm font-medium text-red-700">
                    Your subscription has expired. Please renew immediately.
                  </p>
                </div>
              );
            }
            return null;
          })()}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-[#051536]">{planName}</h3>
                <Badge
                  variant={isPending ? 'secondary' : isPlanActive(planStatus) ? 'default' : 'destructive'}
                  className={isPending ? 'text-xs bg-amber-100 text-amber-700' : 'text-xs'}
                >
                  {planStatus === 'active' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                  {planStatus !== 'active' && <AlertCircle className="mr-1 h-3 w-3" />}
                  {isPending ? 'Awaiting Payment' : planStatus.charAt(0).toUpperCase() + planStatus.slice(1)}
                </Badge>
              </div>
              {subscription && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatPrice(subscription.price_monthly)}/month
                  {subscription.billing_cycle === 'yearly' && ` (billed ${formatPrice(subscription.price_yearly)}/year)`}
                </p>
              )}
              {!subscription && organization?.plan && (
                <p className="text-xs text-muted-foreground mt-1">
                  {isPending
                    ? 'Payment pending — your plan activates once payment is confirmed.'
                    : organization.plan === 'free'
                    ? 'Free plan — no payment required'
                    : `Current plan: ${organization.plan}`}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/billing/upgrade')}
              className="rounded-lg shrink-0"
            >
              Change Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#032364]/10">
              <Users className="h-4 w-4 text-[#032364]" />
            </div>
            <h2 className="text-sm font-semibold text-[#051536]">Usage</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Employees */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-[#051536]">Employees</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {employeeUsage} / {formatLimit(employeeMax)}
                </span>
              </div>
              {!isUnlimited(employeeMax) && (
                <>
                  <Progress value={employeePercent} className="h-2" />
                  {isAtLimit && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      You&apos;re at {employeePercent}% of your employee limit
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Departments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-[#051536]">Departments</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {departmentUsage} / {formatLimit(departmentMax)}
                </span>
              </div>
              {!isUnlimited(departmentMax) && (
                <Progress value={departmentPercent} className="h-2" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Features */}
      {subscription && subscription.features.length > 0 && (
        <Card className="rounded-xl border-0 bg-white vcgl-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#032364]/10">
                <CheckCircle2 className="h-4 w-4 text-[#032364]" />
              </div>
              <h2 className="text-sm font-semibold text-[#051536]">Included Features</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subscription.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-[#051536]">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#032364]/10">
              <Calendar className="h-4 w-4 text-[#032364]" />
            </div>
            <h2 className="text-sm font-semibold text-[#051536]">Invoices</h2>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No invoices yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Invoices will appear here after your first payment
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-[#e2e8f0]"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#051536]">
                        {invoice.description || `Invoice #${invoice.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        invoice.status === 'paid' ? 'default' :
                        invoice.status === 'pending' ? 'secondary' : 'destructive'
                      }
                      className="text-xs"
                    >
                      {invoice.status}
                    </Badge>
                    <span className="text-sm font-medium text-[#051536]">
                      {formatPrice(invoice.amount, invoice.currency)}
                    </span>
                    {invoice.status === 'paid' && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Provider Info */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#032364]/10">
              <Shield className="h-4 w-4 text-[#032364]" />
            </div>
            <h2 className="text-sm font-semibold text-[#051536]">Payment Gateway</h2>
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-lg border border-[#e2e8f0]">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${paymentConfigured ? 'bg-green-100' : 'bg-amber-100'}`}>
                <CreditCard className={`h-5 w-5 ${paymentConfigured ? 'text-green-600' : 'text-amber-600'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#051536]">Paystack</p>
                <p className="text-xs text-muted-foreground">
                  {paymentConfigured ? 'Payment processing is active' : 'Not configured — contact support'}
                </p>
              </div>
            </div>
            <Badge variant={paymentConfigured ? 'default' : 'secondary'} className="text-xs">
              {paymentConfigured ? (
                <><CheckCircle2 className="mr-1 h-3 w-3" /> Active</>
              ) : (
                <><AlertCircle className="mr-1 h-3 w-3" /> Inactive</>
              )}
            </Badge>
          </div>
          
          {!paymentConfigured && (
            <p className="text-xs text-muted-foreground mt-3">
              Contact your platform administrator to enable online payments.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
